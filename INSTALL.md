# Manuel d'installation — Kalamos

Kalamos est une plateforme locale de rédaction LaTeX (type Overleaf) : éditeur
de code, arborescence de fichiers, compilation LaTeX dans Docker et aperçu PDF
en direct.

Avec la version Docker, **aucune installation de Node.js ni de LaTeX n'est
nécessaire** sur la machine de l'utilisateur. Il suffit de Docker.

---

## 1. Prérequis

- **Windows** : [Docker Desktop](https://www.docker.com/products/docker-desktop/) (avec le moteur WSL2).
- **macOS** : [Docker Desktop](https://www.docker.com/products/docker-desktop/).
- **Linux** : Docker Engine + le plugin `docker compose`.
- **Espace disque** : environ 5 Go (image TeX Live complète).
- **Réseau** : la première compilation télécharge les images (~4 Go).

Vérifiez que Docker est bien installé :

```bash
docker --version
docker compose version
```

Sur Windows, lancez **Docker Desktop** et attendez qu'il soit prêt (icône verte).

---

## 2. Récupérer le projet

```bash
git clone https://github.com/Bjibjihamza/Kalamos.git kalamos
cd kalamos
```

Ou copiez le dossier `kalamos` tel quel.

---

## 3. Lancer l'application

```bash
docker compose up -d --build
```

Ceci :
1. Construit l'image de compilation **LaTeX** (TeX Live complet).
2. Construit l'image de l'**application** (serveur + interface web).
3. Démarre les deux conteneurs.

La première exécution est longue (téléchargement des images). Les suivantes
sont immédiates.

### Vérifier le démarrage

```bash
docker compose ps
```

Attendez que les deux services soient `Up` :

```
NAME            STATUS
kalamos         Up ...
kalamos-latex   Up ...
```

---

## 4. Utiliser Kalamos

Ouvrez le navigateur : **http://localhost:4000**

1. Cliquez sur **Nouveau projet**, choisissez un nom et un modèle
   (`report` = mémoire/thèse, `article`, `blank`).
2. Éditez `main.tex` dans l'éditeur (enregistrement automatique).
3. Cliquez sur **Compile** (ou modifiez un fichier .tex pour la compilation auto).
4. L'aperçu PDF se met à jour automatiquement ; un clic sur le PDF ramène à la
   ligne source correspondante (SyncTeX).

Raccourcis utiles : `Ctrl+Enter` pour compiler, `Ctrl+S` pour enregistrer,
`Ctrl+K` pour la palette de commandes.

---

## 5. Arrêter / redémarrer

| Action | Commande |
|---|---|
| Arrêter les conteneurs | `docker compose down` |
| Redémarrer | `docker compose up -d` |
| Voir les journaux de l'app | `docker compose logs -f kalamos` |
| Reconstruire après une mise à jour du code | `docker compose up -d --build` |
| Réinitialiser tout (données comprises) | `docker compose down` puis supprimer le dossier `projects/` |

---

## 6. Emplacement des données

Les projets créés sont stockés dans le dossier **`projects/`** à la racine du
projet, partagé entre le conteneur LaTeX et le conteneur applicatif.

- Sauvegardez ce dossier pour conserver vos projets.
- Chaque projet contient un fichier `.preleaf/meta.json` (métadonnées internes)
  et un dossier `.build/` (artefacts de compilation, PDF inclus).

---

## 7. Dépannage

| Problème | Solution |
|---|---|
| `port is already allocated` / le port 4000 est occupé | Changez le port dans `docker-compose.yml` (`"4000:4000"` → `"4100:4000"`), ou arrêtez le programme qui utilise le port 4000. |
| `permission denied ... docker.sock` | Sur Linux, ajoutez votre utilisateur au groupe `docker` (`sudo usermod -aG docker $USER`, puis déconnexion/reconnexion). |
| La compilation échoue avec *« Compilation container is not running »* | Vérifiez que `kalamos-latex` est démarré : `docker compose up -d latex`. |
| Le PDF ne s'affiche pas | Cliquez sur **Compile** ; vérifiez les journaux : `docker compose logs -f kalamos`. |
| Image bloquée ou corrompue | `docker compose build --no-cache` |

---

## 8. Mode développement (optionnel, pour les développeurs)

Le mode Docker est recommandé pour les utilisateurs. Les développeurs qui
veulent travailler sur le code peuvent lancer les services directement avec
Node.js :

```bash
npm run setup     # installe les dépendances (server + app)
npm run dev       # serveur (port 4000) + Vite (port 5173) en parallèle
npm test          # lance les tests (serveur + app)
```

Le conteneur LaTeX reste nécessaire pour compiler :

```bash
docker compose up -d latex
```

---

## Notes techniques

- **Conteneur `kalamos-latex`** : image TeX Live complète
  (`ghcr.io/xu-cheng/texlive-full`), utilisée pour la compilation via
  `latexmk` (multi-passes + biblatex/biber + SyncTeX). Le moteur est choisi
  automatiquement : pdflatex par défaut, XeLaTeX si le projet possède son
  propre `.latexmkrc`.
- **Conteneur `kalamos`** : serveur Express (API REST + Socket.IO) servant
  l'interface React construite. Il pilote le conteneur LaTeX via le socket
  Docker de la machine hôte (`/var/run/docker.sock`).
- Les projets montés dans les deux conteneurs restent **sur la machine hôte**
  (dossier `projects/`), donc aucune donnée n'est perdue à l'arrêt des conteneurs.
