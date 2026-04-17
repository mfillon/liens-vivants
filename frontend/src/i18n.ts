export type Lang = 'fr' | 'en';

export function detectLang(): Lang {
  return navigator.language.startsWith('fr') ? 'fr' : 'en';
}

export function defaultParticipantName(n: number, lang: Lang): string {
  return lang === 'fr' ? `Participant·e ${n}` : `Participant ${n}`;
}

const translations = {
  en: {
    // Page
    'page.title': 'Admin — Mental Map',
    'admin.h1': 'Admin — Mental Map',
    // Login
    'login.heading': 'Login',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.button': 'Login',
    'login.logout': 'Logout',
    'login.error.invalid': 'Invalid credentials.',
    'login.error.server': 'Server error. Please try again.',
    'login.error.network': 'Network error. Please try again.',
    // Create project
    'create.heading': 'Create New Project',
    'create.center_label': 'Main question / center node label',
    'create.center_placeholder': 'e.g. What motivates you at work?',
    'create.language': 'Participant form language',
    'create.language_en': 'English',
    'create.language_fr': 'French',
    'create.branches_legend': 'Branch labels (up to 5)',
    'create.branch': 'Branch',
    'create.submit': 'Create Project & Generate Link',
    'create.link_label': 'Shareable link:',
    'create.copy': 'Copy',
    'create.error.network': 'Network error. Please try again.',
    // Projects list
    'projects.heading': 'Projects',
    'projects.empty': 'No projects yet.',
    'projects.copy': 'Copy',
    'projects.view_graph': 'View graph →',
    'projects.submissions_singular': 'submission',
    'projects.submissions_plural': 'submissions',
    'projects.no_branch_labels': 'No branch labels defined',
    'projects.show': 'Show submissions',
    'projects.hide': 'Hide submissions',
    // Submissions
    'submissions.empty': 'No submissions yet.',
    'submissions.loading': 'Loading…',
    'submissions.failed': 'Failed to load submissions.',
    // Tools
    'tools.heading': 'Tools',
    'tools.recompute_info':
      'Recompute connections if you changed keyword logic or imported data manually.',
    'tools.recompute_btn': 'Recompute all connections',
    'tools.recomputing': 'Recomputing…',
    'tools.recompute_success': 'Connections recomputed successfully.',
    'tools.recompute_error': 'Failed to recompute connections.',
    'tools.network_error': 'Network error.',
    // Submit page
    'submit.invalid_link': 'Invalid link. Please use the link provided by the organizer.',
    'submit.not_found': 'Link not found or expired. Please contact the organizer.',
    'submit.participant_label': 'Your name (optional)',
    'submit.participant_placeholder': 'e.g. Participant 1',
    'submit.branches_legend': 'Branches',
    'submit.button': 'Submit',
    'submit.branch_placeholder': 'Your answer…',
    'submit.success': 'Thank you! Your response has been submitted.',
    'submit.dismiss': 'Dismiss',
    'submit.error.network': 'Network error. Please try again.',
    'submit.error.uploads': 'Submitted, but some uploads failed:',
    // Graph page
    'graph.hint': 'Click a node or connection to explore',
    'graph.orbit_pause': '⏸ Pause orbit',
    'graph.orbit_resume': '▶ Resume orbit',
    'graph.node_singular': 'node',
    'graph.node_plural': 'nodes',
    'graph.connection_singular': 'connection',
    'graph.connection_plural': 'connections',
    'graph.project_question': 'Project question',
    'graph.response': 'Response',
    'graph.connection_label': 'Connection',
    'graph.no_branch_labels': 'No branch labels defined',
    'graph.no_branches': 'No branches',
    'graph.error.no_uuid': 'No project UUID in URL.',
    'graph.error.not_found': 'Project not found.',
    'graph.error.load_failed': 'Failed to load graph data.',
    'graph.participant': 'Participant',
    'graph.answer': 'Answer',
  },
  fr: {
    // Page
    'page.title': 'Admin — Carte mentale',
    'admin.h1': 'Admin — Carte mentale',
    // Login
    'login.heading': 'Connexion',
    'login.username': "Nom d'utilisateur",
    'login.password': 'Mot de passe',
    'login.button': 'Se connecter',
    'login.logout': 'Déconnexion',
    'login.error.invalid': 'Identifiants incorrects.',
    'login.error.server': 'Erreur serveur. Réessayez.',
    'login.error.network': 'Erreur réseau. Réessayez.',
    // Create project
    'create.heading': 'Créer un nouveau projet',
    'create.center_label': 'Question principale / étiquette du nœud central',
    'create.center_placeholder': "ex. Qu'est-ce qui vous motive au travail\u00a0?",
    'create.language': 'Langue du formulaire participant·e',
    'create.language_en': 'Anglais',
    'create.language_fr': 'Français',
    'create.branches_legend': "Étiquettes de branche (jusqu'à 5)",
    'create.branch': 'Branche',
    'create.submit': 'Créer le projet et générer le lien',
    'create.link_label': 'Lien à partager\u00a0:',
    'create.copy': 'Copier',
    'create.error.network': 'Erreur réseau. Réessayez.',
    // Projects list
    'projects.heading': 'Projets',
    'projects.empty': 'Aucun projet pour l\u2019instant.',
    'projects.copy': 'Copier',
    'projects.view_graph': 'Voir le graphe →',
    'projects.submissions_singular': 'soumission',
    'projects.submissions_plural': 'soumissions',
    'projects.no_branch_labels': 'Aucune étiquette de branche',
    'projects.show': 'Voir les soumissions',
    'projects.hide': 'Masquer les soumissions',
    // Submissions
    'submissions.empty': 'Aucune soumission pour l\u2019instant.',
    'submissions.loading': 'Chargement…',
    'submissions.failed': 'Impossible de charger les soumissions.',
    // Tools
    'tools.heading': 'Outils',
    'tools.recompute_info':
      'Recalculez les connexions si vous avez modifié la logique des mots-clés ou importé des données manuellement.',
    'tools.recompute_btn': 'Recalculer toutes les connexions',
    'tools.recomputing': 'Recalcul en cours…',
    'tools.recompute_success': 'Connexions recalculées avec succès.',
    'tools.recompute_error': 'Échec du recalcul des connexions.',
    'tools.network_error': 'Erreur réseau.',
    // Submit page
    'submit.invalid_link': "Lien invalide. Utilisez le lien fourni par l'organisateur·rice.",
    'submit.not_found': "Lien introuvable ou expiré. Contactez l'organisateur·rice.",
    'submit.participant_label': 'Votre prénom (facultatif)',
    'submit.participant_placeholder': 'ex. Participant·e 1',
    'submit.branches_legend': 'Branches',
    'submit.button': 'Envoyer',
    'submit.branch_placeholder': 'Votre réponse…',
    'submit.success': 'Merci\u00a0! Votre réponse a été soumise.',
    'submit.dismiss': 'Fermer',
    'submit.error.network': 'Erreur réseau. Réessayez.',
    'submit.error.uploads': "Soumis, mais certains fichiers n'ont pas pu être envoyés\u00a0:",
    // Graph page
    'graph.hint': 'Cliquez sur un n\u0153ud ou une connexion pour explorer',
    'graph.orbit_pause': '⏸ Pause rotation',
    'graph.orbit_resume': '▶ Reprendre la rotation',
    'graph.node_singular': 'n\u0153ud',
    'graph.node_plural': 'n\u0153uds',
    'graph.connection_singular': 'connexion',
    'graph.connection_plural': 'connexions',
    'graph.project_question': 'Question du projet',
    'graph.response': 'R\u00e9ponse',
    'graph.connection_label': 'Connexion',
    'graph.no_branch_labels': 'Aucune \u00e9tiquette de branche',
    'graph.no_branches': 'Aucune branche',
    'graph.error.no_uuid': 'Aucun UUID de projet dans l\u2019URL.',
    'graph.error.not_found': 'Projet introuvable.',
    'graph.error.load_failed': 'Impossible de charger les donn\u00e9es du graphe.',
    'graph.participant': 'Participant\u00b7e',
    'graph.answer': 'R\u00e9ponse',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, lang: Lang): string {
  return (translations[lang] as Record<string, string>)[key] ?? translations.en[key];
}
