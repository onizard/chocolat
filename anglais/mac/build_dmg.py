#!/usr/bin/env python3
"""Fabrique « Norah Spelling Bee.dmg » pour macOS, depuis Linux ou macOS.

L'application est un petit lanceur : elle copie la page des flashcards dans
~/Library/Application Support/Norah Spelling Bee/ puis l'ouvre dans le
navigateur par défaut. La copie garde toujours le même emplacement, donc les
progrès (stockés par le navigateur) survivent aux mises à jour de l'app.

Les polices Google sont intégrées à la page pour qu'elle marche sans Internet.

Usage : python3 anglais/mac/build_dmg.py [dossier_de_sortie]
Nécessite genisoimage (Linux) ou hdiutil (macOS).
"""
import base64
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request

ICI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(ICI)
NOM = "Norah Spelling Bee"
VERSION = "1.2"
POLICES = ("https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700"
           "&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 "
      "(KHTML, like Gecko) Version/17.0 Safari/605.1.15")

LANCEUR = f"""#!/bin/bash
SRC="$(cd "$(dirname "$0")/../Resources/site" && pwd)"
DEST="$HOME/Library/Application Support/{NOM}"
mkdir -p "$DEST"
cp -f "$SRC"/* "$DEST"/
open "$DEST/index.html"
"""

INFO_PLIST = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>{NOM}</string>
  <key>CFBundleDisplayName</key><string>{NOM}</string>
  <key>CFBundleIdentifier</key><string>fr.onizard.norah-spelling-bee</string>
  <key>CFBundleVersion</key><string>{VERSION}</string>
  <key>CFBundleShortVersionString</key><string>{VERSION}</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>lanceur</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>10.13</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.education</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
"""

LISEZ_MOI = f"""{NOM} — installation sur Mac
==========================================

1. Fais glisser « {NOM} » sur le dossier « Applications ».
2. Ouvre l'application depuis le dossier Applications (ou le Launchpad).
   Les flashcards s'ouvrent dans ton navigateur (Safari, Chrome…).

Si macOS refuse d'ouvrir l'application la première fois
(« impossible de vérifier le développeur ») :
  - Réglages Système → Confidentialité et sécurité → tout en bas,
    à côté du message sur « {NOM} », clique sur « Ouvrir quand même ».
  - Sur les versions plus anciennes de macOS : clic droit sur l'app → Ouvrir.

C'est normal : l'application n'est pas signée par Apple (il faut un compte
développeur payant pour ça). Elle ne fait que copier la page des flashcards
dans ~/Library/Application Support/{NOM}/ et l'ouvrir.

Les progrès de Norah sont gardés par le navigateur. Utilise toujours le même
navigateur pour les retrouver.
"""


def polices_integrees():
    """Renvoie un bloc <style> avec les polices en base64, ou None hors ligne."""
    try:
        req = urllib.request.Request(POLICES, headers={"User-Agent": UA})
        css = urllib.request.urlopen(req, timeout=20).read().decode()
    except Exception as e:  # pas de réseau : la page garde ses polices de secours
        print("Polices non intégrées :", e)
        return None
    blocs = re.findall(r"/\* (\S+) \*/\s*(@font-face \{.*?\})", css, re.S)
    sortie = []
    for jeu, bloc in blocs:
        if jeu != "latin":
            continue
        url = re.search(r"url\((https://[^)]+)\)", bloc).group(1)
        data = urllib.request.urlopen(url, timeout=20).read()
        sortie.append(bloc.replace(url, "data:font/woff2;base64," + base64.b64encode(data).decode()))
    return "<style>\n" + "\n".join(sortie) + "\n</style>"


def page_hors_ligne():
    html = open(os.path.join(SITE, "index.html"), encoding="utf-8").read()
    # retire ce qui ne sert qu'à la version en ligne
    html = re.sub(r'<link rel="(manifest|preconnect)"[^>]*>\n', "", html)
    html = re.sub(r'<link href="https://fonts\.googleapis\.com[^>]*>\n', "", html)
    style = polices_integrees()
    if style:
        html = html.replace("<style>", style + "\n<style>", 1)
    return html


def construire(sortie):
    tmp = tempfile.mkdtemp()
    racine = os.path.join(tmp, NOM)
    app = os.path.join(racine, NOM + ".app", "Contents")
    os.makedirs(os.path.join(app, "MacOS"))
    os.makedirs(os.path.join(app, "Resources", "site"))

    open(os.path.join(app, "Info.plist"), "w").write(INFO_PLIST)
    open(os.path.join(app, "PkgInfo"), "w").write("APPL????")
    lanceur = os.path.join(app, "MacOS", "lanceur")
    open(lanceur, "w").write(LANCEUR)
    os.chmod(lanceur, 0o755)
    shutil.copy(os.path.join(ICI, "AppIcon.icns"), os.path.join(app, "Resources"))
    open(os.path.join(app, "Resources", "site", "index.html"), "w", encoding="utf-8").write(page_hors_ligne())
    shutil.copy(os.path.join(SITE, "icon.svg"), os.path.join(app, "Resources", "site"))

    os.symlink("/Applications", os.path.join(racine, "Applications"))
    open(os.path.join(racine, "Lisez-moi.txt"), "w").write(LISEZ_MOI)

    os.makedirs(sortie, exist_ok=True)
    dmg = os.path.join(sortie, NOM + ".dmg")
    if os.path.exists(dmg):
        os.remove(dmg)
    if shutil.which("hdiutil"):
        subprocess.run(["hdiutil", "create", "-volname", NOM, "-srcfolder", racine,
                        "-ov", "-format", "UDZO", dmg], check=True)
    else:
        # Image ISO 9660 + Rock Ridge (garde le droit d'exécution et le lien
        # Applications) + Joliet : macOS l'ouvre comme n'importe quel .dmg.
        subprocess.run(["genisoimage", "-quiet", "-V", NOM[:32], "-D", "-R", "-J",
                        "-joliet-long", "-no-pad", "-o", dmg, racine], check=True)
    shutil.rmtree(tmp)
    print("Créé :", dmg)


if __name__ == "__main__":
    construire(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, "dist"))
