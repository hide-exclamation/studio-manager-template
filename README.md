# Studio Manager - Template pour agences créatives

Application de gestion complète pour studios créatifs, agences et freelances. Développée avec Next.js 16, Prisma et Supabase.

## 🚀 Démarrage rapide

### Prérequis

- Node.js 18+
- npm ou yarn
- Un compte [Supabase](https://supabase.com) (gratuit)
- Un compte [Resend](https://resend.com) pour l'envoi d'emails (gratuit jusqu'à 3000 emails/mois)

### Installation

```bash
# 1. Cloner le repository
git clone https://github.com/votre-username/studio-manager.git
cd studio-manager

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos credentials (voir section Configuration)

# 4. Initialiser la base de données
npx prisma migrate dev

# 5. Lancer le serveur de développement
npm run dev
```

### Premier lancement

Au premier lancement, vous serez redirigé vers un **Setup Wizard** qui vous permettra de configurer :

1. **Informations de l'entreprise** - Nom, logo, adresse, coordonnées
2. **Configuration fiscale** - Numéros et taux de TPS/TVQ
3. **Personnalisation visuelle** - Couleurs de marque

## ⚙️ Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# ============================================
# SUPABASE (Base de données + Auth)
# ============================================
# Trouvez ces valeurs dans Settings > API de votre projet Supabase
NEXT_PUBLIC_SUPABASE_URL="https://votre-projet.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="votre-anon-key"

# ============================================
# DATABASE
# ============================================
# Connection pooler (pour l'app) - Settings > Database > Connection string > URI
DATABASE_URL="postgresql://postgres.[ref]:[password]@[host]:6543/postgres?pgbouncer=true"

# Direct connection (pour les migrations) - Settings > Database > Connection string > URI (Direct)
DIRECT_URL="postgresql://postgres.[ref]:[password]@[host]:5432/postgres"

# ============================================
# EMAIL (Resend)
# ============================================
# Créez une API key sur https://resend.com
RESEND_API_KEY="re_xxxxxxxxxxxx"

# ============================================
# SÉCURITÉ
# ============================================
# Clé de chiffrement pour les identifiants clients (32 caractères)
# Générez-en une avec: openssl rand -hex 16
CREDENTIALS_ENCRYPTION_KEY="votre-cle-32-caracteres-ici"

# ============================================
# APPLICATION
# ============================================
# URL de base pour les liens dans les emails
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
# En production : "https://votre-domaine.com"
```

### Configuration Supabase

1. Créez un nouveau projet sur [Supabase](https://supabase.com)
2. Dans **Authentication > URL Configuration**, ajoutez :
   - Site URL : `http://localhost:3000` (ou votre domaine de production)
   - Redirect URLs : `http://localhost:3000/**`
3. Récupérez les clés API dans **Settings > API**

### Configuration Resend (Emails)

1. Créez un compte sur [Resend](https://resend.com)
2. Vérifiez votre domaine pour l'envoi d'emails
3. Créez une API key et ajoutez-la dans `.env`

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
  // ...
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

@font-face {
  font-family: 'Custom Body';
  src: url('/fonts/VotrePolice-Regular.woff2') format('woff2');
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

1. **Via l'interface** : Paramètres > Upload du logo
2. Le logo est stocké dans Supabase Storage

### Informations fiscales (Québec)

L'application est configurée par défaut pour le Québec avec :
- **TPS** : 5%
- **TVQ** : 9.975%

Ces taux sont configurables dans les paramètres.

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

## 🚀 Déploiement

### Vercel (Recommandé)

1. Connectez votre repo GitHub à [Vercel](https://vercel.com)
2. Configurez les variables d'environnement
3. Déployez

La configuration Vercel est déjà incluse dans le projet.

### Autres plateformes

L'application est compatible avec toute plateforme supportant Next.js :
- Railway
- Render
- DigitalOcean App Platform
- Self-hosted (Docker)

## 🔒 Sécurité

- Les identifiants clients sont chiffrés avec AES-256-GCM
- L'authentification utilise Supabase Auth avec tokens JWT
- Les headers de sécurité sont configurés automatiquement
- Les PDFs sont générés côté serveur

## 📄 Licence

MIT - Libre d'utilisation pour projets personnels et commerciaux.

## 🤝 Contribution

Les contributions sont les bienvenues ! Ouvrez une issue ou une pull request.

---

Développé avec ❤️ par des créatifs, pour des créatifs.
