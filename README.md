# Studio Manager - Template pour agences créatives

Application de gestion complète pour studios créatifs, agences et freelances. Développée avec Next.js 16, Prisma et Supabase.

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- npm ou yarn
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Resend](https://resend.com) pour l'envoi d'emails (optionnel, gratuit jusqu'à 3000 emails/mois)

---

## 📋 Installation pas à pas

### Étape 1 : Cloner et installer

```bash
git clone https://github.com/votre-username/studio-manager.git
cd studio-manager
npm install
```

### Étape 2 : Créer un projet Supabase

1. Allez sur [supabase.com/dashboard](https://supabase.com/dashboard)
2. Cliquez **"New Project"**
3. Remplissez :
   - **Name** : Le nom de votre choix
   - **Database Password** : Générez un mot de passe fort et **notez-le !**
   - **Region** : Choisissez la plus proche de vous
4. Attendez ~2 minutes que le projet soit prêt

### Étape 3 : Récupérer les credentials Supabase

#### A. Clés API

1. Dans votre projet Supabase, allez dans **Settings** (icône engrenage)
2. Cliquez sur **API Keys**
3. Copiez :
   - **Publishable key** → C'est votre `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - L'URL du projet est : `https://[votre-ref-projet].supabase.co` → C'est votre `NEXT_PUBLIC_SUPABASE_URL`

#### B. URLs de base de données

1. Cliquez sur le bouton **"Connect"** en haut de la page
2. Dans la fenêtre "Connect to your project" :

   **Pour DATABASE_URL :**
   - Sélectionnez **Method: Transaction pooler**
   - Copiez l'URL (format : `postgresql://postgres.[ref]:[PASSWORD]@...pooler.supabase.com:6543/postgres`)
   - Ajoutez `?pgbouncer=true` à la fin

   **Pour DIRECT_URL :**
   - Sélectionnez **Method: Direct connection**
   - Copiez l'URL (format : `postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres`)

3. Remplacez `[YOUR-PASSWORD]` par votre mot de passe de base de données

> ⚠️ **Important** : Si votre mot de passe contient des caractères spéciaux (`!`, `@`, `#`, etc.), vous devez les encoder :
> - `!` → `%21`
> - `@` → `%40`
> - `#` → `%23`
> - Exemple : `MonPass!` devient `MonPass%21`

### Étape 4 : Configurer le fichier .env

Créez un fichier `.env` à la racine du projet :

```bash
cp .env.example .env
```

Puis éditez-le avec vos valeurs :

```env
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL="https://votre-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_xxxx..."

# DATABASE (remplacez [PASSWORD] par votre mot de passe encodé)
DATABASE_URL="postgresql://postgres.votre-ref:[PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.votre-ref.supabase.co:5432/postgres"

# EMAIL (optionnel - laissez vide pour tester sans emails)
RESEND_API_KEY=""

# SÉCURITÉ - Générez une clé avec: openssl rand -hex 16
CREDENTIALS_ENCRYPTION_KEY="votre-cle-32-caracteres"

# APPLICATION
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### Étape 5 : Initialiser la base de données

```bash
npx prisma db push
```

Cette commande crée toutes les tables nécessaires dans votre base de données Supabase.

### Étape 6 : Configurer l'authentification Supabase

1. Dans Supabase, allez dans **Authentication** > **URL Configuration**
2. Configurez :
   - **Site URL** : `http://localhost:3000`
   - **Redirect URLs** : `http://localhost:3000/**`

3. Dans **Authentication** > **Providers**, assurez-vous que **Email** est activé

### Étape 7 : Créer votre compte utilisateur

1. Dans Supabase, allez dans **Authentication** > **Users**
2. Cliquez **"Add user"** > **"Create new user"**
3. Entrez votre email et un mot de passe
4. Cochez **"Auto Confirm User"**
5. Cliquez **"Create user"**

### Étape 8 : Lancer l'application

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## 🎉 Premier lancement

Au premier lancement, vous serez redirigé vers un **Setup Wizard** qui vous permettra de configurer :

1. **Informations de l'entreprise** - Nom, logo, adresse, coordonnées
2. **Configuration fiscale** - Numéros et taux de TPS/TVQ
3. **Personnalisation visuelle** - Couleurs de marque

---

## 🎨 Personnalisation

### Couleurs de marque

Les couleurs peuvent être modifiées de deux façons :

1. **Via l'interface** : Paramètres > Apparence (recommandé)
2. **Via le code** : Modifiez les valeurs par défaut dans `src/lib/settings.ts`

```typescript
export const DEFAULTS = {
  colorBackground: '#F5F5F5',  // Couleur de fond
  colorAccent: '#6366F1',      // Couleur d'accent
  colorAccentDark: '#4F46E5',  // Couleur d'accent foncée
}
```

### Polices de caractères

Par défaut, l'application utilise :
- **Titres** : [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) (Google Fonts)
- **Corps** : [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts)

#### Utiliser des polices personnalisées

1. Ajoutez vos fichiers `.woff2` dans `/public/fonts/`
2. Modifiez `src/app/globals.css` :

```css
/* Décommentez et modifiez les @font-face */
@font-face {
  font-family: 'Custom Heading';
  src: url('/fonts/VotrePolice-Heading.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* Puis modifiez les variables CSS */
:root {
  --font-heading: 'Custom Heading', Georgia, serif;
  --font-body: 'Custom Body', system-ui, sans-serif;
}
```

3. Mettez à jour les PDFs dans :
   - `src/app/api/quotes/[id]/pdf/route.ts`
   - `src/app/api/invoices/[id]/pdf/route.ts`

### Logo

Uploadez votre logo dans **Paramètres > Informations de l'entreprise**. Le logo sera stocké dans Supabase Storage.

### Informations fiscales (Québec)

L'application est configurée par défaut pour le Québec avec :
- **TPS** : 5%
- **TVQ** : 9.975%

Ces taux sont configurables dans le Setup Wizard et dans les paramètres.

---

## 📱 Fonctionnalités

### Gestion des clients
- Multi-contacts par client
- Statuts : Prospect, Actif, Inactif
- Lien Google Drive intégré
- Gestionnaire d'identifiants sécurisé (chiffrement AES-256)

### Projets
- Numérotation automatique par client (ex: ABC-001)
- Catégorisation personnalisable
- Tâches avec sous-tâches et dates d'échéance
- Timer de suivi du temps intégré

### Devis
- Sections et items avec bibliothèque réutilisable
- Types d'items : Service, Produit, Gratuit, À la carte
- Facturation fixe ou horaire par item
- Rabais multiples (% ou fixe)
- Vue publique animée (GSAP) avec approbation en ligne
- Envoi par email avec templates personnalisables
- Génération PDF

### Factures
- Création depuis devis (dépôt, partielle, finale)
- Numérotation intelligente
- Suivi des paiements
- Rappels automatiques par email
- Génération PDF

### Dépenses
- Suivi par catégorie et projet
- Catégories personnalisables

### Statistiques
- Tableau de bord avec KPIs
- Revenus par période et catégorie
- Taux de conversion
- Rentabilité par projet

### Notifications
- Rappels factures en retard
- Alertes consultation/approbation devis

### PWA
- Installation sur mobile/desktop
- Fonctionne hors ligne

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── (admin)/          # Pages protégées
│   │   ├── clients/      # Gestion clients
│   │   ├── projets/      # Projets et tâches
│   │   ├── devis/        # Création et gestion devis
│   │   ├── factures/     # Facturation
│   │   ├── depenses/     # Suivi dépenses
│   │   ├── statistiques/ # Tableaux de bord
│   │   └── parametres/   # Configuration
│   ├── api/              # Routes API
│   ├── devis/public/     # Vue publique devis
│   ├── factures/public/  # Vue publique factures
│   ├── setup/            # Assistant de configuration
│   └── login/            # Authentification
├── components/
│   ├── layout/           # Sidebar, header
│   ├── library/          # Bibliothèque de sections/items
│   ├── credentials/      # Gestionnaire identifiants
│   ├── timer/            # Suivi du temps
│   ├── email/            # Envoi emails
│   └── ui/               # Composants réutilisables
├── emails/               # Templates React Email
└── lib/
    ├── prisma.ts         # Client base de données
    ├── settings.ts       # Service de configuration
    ├── email.ts          # Utilitaires email
    ├── encryption.ts     # Chiffrement AES
    ├── puppeteer.ts      # Génération PDF
    └── supabase/         # Clients Supabase
```

---

## 🚀 Déploiement

### Vercel (Recommandé)

1. Connectez votre repo GitHub à [Vercel](https://vercel.com)
2. Configurez les variables d'environnement (les mêmes que votre `.env`)
3. Déployez

La configuration Vercel est déjà incluse dans le projet (`vercel.json`).

### Autres plateformes

L'application est compatible avec toute plateforme supportant Next.js :
- Railway
- Render
- DigitalOcean App Platform
- Self-hosted (Docker)

---

## 🔒 Sécurité

- Les identifiants clients sont chiffrés avec AES-256-GCM
- L'authentification utilise Supabase Auth avec tokens JWT
- Les headers de sécurité sont configurés automatiquement
- Les PDFs sont générés côté serveur

---

## ❓ Dépannage

### "Prisma db push" timeout ou très lent

**Cause** : Prisma utilise `DATABASE_URL` qui pointe vers le Transaction pooler, mais les migrations nécessitent une connexion directe.

**Solution** : Assurez-vous que `DIRECT_URL` est correctement configuré dans votre `.env` et que `directUrl` est présent dans `prisma/schema.prisma` :

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // ← Important !
}
```

### Erreur "prepared statement already exists"

**Cause** : Vous utilisez le Transaction pooler pour une opération qui ne le supporte pas.

**Solution** : Cette erreur survient quand Prisma essaie d'utiliser `DATABASE_URL` (pooler) au lieu de `DIRECT_URL` (direct). Vérifiez que `directUrl` est bien dans votre schema Prisma.

### Mot de passe avec caractères spéciaux

Si votre mot de passe contient des caractères spéciaux (`!`, `@`, `#`, `$`, etc.), vous devez les encoder dans les URLs :

| Caractère | Encodage |
|-----------|----------|
| `!` | `%21` |
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |

**Exemple** : `MonMotDePasse!` devient `MonMotDePasse%21`

### Erreur d'authentification

- Assurez-vous d'avoir créé un utilisateur dans **Supabase > Authentication > Users**
- Cliquez **"Add user"** > **"Create new user"**
- **Important** : Cochez **"Auto Confirm User"** sinon vous devrez confirmer par email

### Les emails ne s'envoient pas

- Vérifiez que `RESEND_API_KEY` est configuré dans votre `.env`
- Vérifiez que votre domaine est vérifié dans [Resend](https://resend.com)
- Pour tester sans emails, laissez `RESEND_API_KEY=""` (les fonctionnalités email seront désactivées)

---

## 📄 Licence

MIT - Libre d'utilisation pour projets personnels et commerciaux.

## 🤝 Contribution

Les contributions sont les bienvenues ! Ouvrez une issue ou une pull request.

---

Développé avec ❤️ par des créatifs, pour des créatifs.
