# Scrib

Plateforme moderne de transcription audio, traitement de documents transcripts et génération de synthèses exécutives.

Scrib permet de transformer n'importe quel enregistrement audio ou document textuel en transcription structurée, avec horodatages précis, identification des intervenants, extraction des décisions et synthèses décisionnelles complètes.

---

## Fonctionnalités principales

### 1. Transcription audio haute précision
- **Formats pris en charge** : MP3, WAV, FLAC, M4A, AAC, OGG, WebM.
- **Enregistrements longs (> 1 heure)** : Découpage automatique en blocs synchronisés de 10 minutes avec réassemblage continu et fluide.
- **Identification des intervenants** : Détection automatique des locuteurs (*Speaker 1*, *Speaker 2*, etc.) avec attribution contextuelle.
- **Horodatages précis** : Chaque phrase est découpée en segment temporel (début - fin).

### 2. Import direct de fichiers transcripts
- Importez vos fichiers déjà transcrits sans avoir besoin de réuploader le fichier audio original :
  - **Sous-titres & vidéos** : `.srt` (SubRip), `.vtt` (WebVTT).
  - **Documents bureautiques** : `.docx` (Microsoft Word).
  - **Données structurées** : `.json` (exports Whisper, Zoom, Otter, Teams, AWS Transcribe).
  - **Tableurs** : `.csv`, `.tsv` (colonnes temps, intervenant, texte).
  - **Texte brut** : `.txt`, `.md` (détection des marqueurs de temps et des intervenants).
- Génération immédiate de la synthèse détaillée, des points essentiels et des actions à retenir dès l'import.

### 3. Synthèses structurées & extraction d'actions
- **Formats de synthèse au choix** :
  - *Dossier détaillé & approfondi* (vue d'ensemble, analyse contextuelle, implications, feuille de route).
  - *Points clés à puces* (relevé synthétique des faits marquants).
  - *Compte-rendu de réunion* (ordre du jour, participants, délibérations, décisions actées).
  - *Flash exécutif* (résumé percutant en un paragraphe).
- **Points essentiels majeurs** : Relevé exhaustif des éléments critiques abordés.
- **Plan d'actions & décisions** : Liste claire des livrables, porteurs d'actions et échéances.

### 4. Lecteur audio synchronisé & éditeur interactif
- Lecteur audio intégré avec contrôle de vitesse (0.75x à 2x) et saut de 5 secondes.
- Clic direct sur n'importe quel segment pour déplacer la tête de lecture à cet instant précis.
- Surlignage dynamique du segment en cours d'écoute.
- Modification textuelle directe de chaque segment et renommage global des intervenants.
- Recherche et remplacement textuel en temps réel avec surbrillance visuelle.

### 5. Traduction multilingue
- Traduction intégrale de la transcription ou de la synthèse en un clic.
- Langues supportées : Français, Anglais, Espagnol, Allemand, Italien, Portugais, Arabe, Chinois, Japonais.

### 6. Exportations professionnelles
- **Export PDF** : Document prêt à imprimer et partager, avec en-tête, métadonnées, synthèse complète, tableau des actions et transcription horodatée.
- **Export TXT** : Fichier texte épuré.
- **Export SRT** : Fichier de sous-titres prêt à être importé dans vos logiciels de montage vidéo.
- **Export JSON** : Données complètes pour intégrations automatisées.

### 7. Confidentialité & stockage local
- Toutes vos transcriptions, synthèses et fichiers audio sont stockés localement sur votre navigateur (via IndexedDB).
- Aucun historique n'est conservé sur des serveurs distants une fois le traitement terminé.

---

## Architecture technique

- **Interface utilisateur** : React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Serveur backend** : Node.js, Express, middleware Vite.
- **Moteur de traitement** : Service de traitement linguistique et audio Gemini avec gestion automatique des quotas, nouvelles tentatives exponentielles et bascule sur modèles légers haute disponibilité (`gemini-flash-lite-latest`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`).
- **Génération de documents** : jsPDF avec mise en page adaptative multi-pages.

---

## Installation et démarrage

### Prérequis
- Node.js version 20 ou supérieure.
- Un gestionnaire de paquets (`npm` ou `bun`).
- Une clé d'API Gemini valide (Google Cloud / Google Developers).

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration des variables d'environnement
Créez un fichier `.env` à la racine en copiant le modèle fourni :
```bash
cp .env.example .env
```

Éditez le fichier `.env` et renseignez votre clé d'API :
```env
GEMINI_API_KEY="votre_cle_api_ici"
PORT=3000
HOST="0.0.0.0"
NODE_ENV="development"
BODY_LIMIT="75mb"
```

### 3. Lancement en mode développement
```bash
npm run dev
```
L'application est accessible sur `http://localhost:3000`.

### 4. Compilation et déploiement en production
```bash
npm run build
npm run start
```
Le serveur Express optimisé démarre et sert le bundle compilé sous `dist/`.

---

## Scripts disponibles

| Commande | Action |
| :--- | :--- |
| `npm run dev` | Démarre le serveur de développement avec rechargement automatique |
| `npm run build` | Compile l'application cliente et le serveur Node.js dans `dist/` |
| `npm run start` | Lance le serveur de production compilé |
| `npm run lint` | Vérifie le typage TypeScript et la cohérence du code |
| `npm run clean` | Supprime les répertoires de compilation temporaires |

---

## Licence

Ce projet est distribué sous licence propriétaire privée. Tous droits réservés.
