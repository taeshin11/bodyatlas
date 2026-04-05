export type Locale = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'de' | 'fr';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'ko', 'ja', 'zh', 'es', 'de', 'fr'];

const translations: Record<Locale, Record<string, string>> = {
  en: {
    'header.about': 'About',
    'header.download': 'Download',
    'footer.builtBy': 'Built by SPINAI',
    'feedback.title': 'Send Feedback',
    'feedback.placeholder': 'How can we improve BodyAtlas?',
    'feedback.email': 'Email (optional)',
    'feedback.send': 'Send Feedback',
    'feedback.sending': 'Sending...',
    'feedback.thanks': 'Thanks for your feedback!',
    'install.title': 'Install BodyAtlas',
    'install.desc': 'Add to home screen for quick access — works offline',
    'install.button': 'Install App',
    'error.title': 'Something went wrong',
    'error.message': 'An error occurred. Try refreshing the page.',
    'error.refresh': 'Refresh Page',
    'notfound.title': 'Page not found',
    'notfound.message': 'The page you\'re looking for doesn\'t exist.',
    'notfound.back': 'Back to BodyAtlas',
  },
  ko: {
    'header.about': '소개',
    'header.download': '다운로드',
    'footer.builtBy': 'SPINAI 제작',
    'feedback.title': '피드백 보내기',
    'feedback.placeholder': 'BodyAtlas를 어떻게 개선할 수 있을까요?',
    'feedback.email': '이메일 (선택사항)',
    'feedback.send': '피드백 보내기',
    'feedback.sending': '전송 중...',
    'feedback.thanks': '피드백 감사합니다!',
    'install.title': 'BodyAtlas 설치',
    'install.desc': '홈 화면에 추가하여 빠르게 접근 — 오프라인 사용 가능',
    'install.button': '앱 설치',
    'error.title': '문제가 발생했습니다',
    'error.message': '오류가 발생했습니다. 페이지를 새로고침해 보세요.',
    'error.refresh': '페이지 새로고침',
    'notfound.title': '페이지를 찾을 수 없습니다',
    'notfound.message': '찾으시는 페이지가 존재하지 않습니다.',
    'notfound.back': 'BodyAtlas로 돌아가기',
  },
  ja: {
    'header.about': '概要',
    'header.download': 'ダウンロード',
    'footer.builtBy': 'SPINAI制作',
    'feedback.title': 'フィードバック送信',
    'feedback.placeholder': 'BodyAtlasをどのように改善できますか？',
    'feedback.email': 'メール（任意）',
    'feedback.send': 'フィードバック送信',
    'feedback.sending': '送信中...',
    'feedback.thanks': 'フィードバックありがとうございます！',
    'install.title': 'BodyAtlasをインストール',
    'install.desc': 'ホーム画面に追加 — オフラインでも使用可能',
    'install.button': 'アプリをインストール',
    'error.title': '問題が発生しました',
    'error.message': 'エラーが発生しました。ページを更新してみてください。',
    'error.refresh': 'ページ更新',
    'notfound.title': 'ページが見つかりません',
    'notfound.message': 'お探しのページは存在しません。',
    'notfound.back': 'BodyAtlasに戻る',
  },
  zh: {
    'header.about': '关于',
    'header.download': '下载',
    'footer.builtBy': 'SPINAI 制作',
    'feedback.title': '发送反馈',
    'feedback.placeholder': '如何改进 BodyAtlas？',
    'feedback.email': '邮箱（可选）',
    'feedback.send': '发送反馈',
    'feedback.sending': '发送中...',
    'feedback.thanks': '感谢您的反馈！',
    'install.title': '安装 BodyAtlas',
    'install.desc': '添加到主屏幕快速访问 — 支持离线使用',
    'install.button': '安装应用',
    'error.title': '出现问题',
    'error.message': '发生错误。请尝试刷新页面。',
    'error.refresh': '刷新页面',
    'notfound.title': '页面未找到',
    'notfound.message': '您查找的页面不存在。',
    'notfound.back': '返回 BodyAtlas',
  },
  es: {
    'header.about': 'Acerca de',
    'header.download': 'Descargar',
    'footer.builtBy': 'Hecho por SPINAI',
    'feedback.title': 'Enviar comentarios',
    'feedback.placeholder': '¿Cómo podemos mejorar BodyAtlas?',
    'feedback.email': 'Correo (opcional)',
    'feedback.send': 'Enviar',
    'feedback.sending': 'Enviando...',
    'feedback.thanks': '¡Gracias por sus comentarios!',
    'install.title': 'Instalar BodyAtlas',
    'install.desc': 'Añadir a la pantalla de inicio — funciona sin conexión',
    'install.button': 'Instalar app',
    'error.title': 'Algo salió mal',
    'error.message': 'Ocurrió un error. Intente actualizar la página.',
    'error.refresh': 'Actualizar página',
    'notfound.title': 'Página no encontrada',
    'notfound.message': 'La página que busca no existe.',
    'notfound.back': 'Volver a BodyAtlas',
  },
  de: {
    'header.about': 'Über uns',
    'header.download': 'Herunterladen',
    'footer.builtBy': 'Erstellt von SPINAI',
    'feedback.title': 'Feedback senden',
    'feedback.placeholder': 'Wie können wir BodyAtlas verbessern?',
    'feedback.email': 'E-Mail (optional)',
    'feedback.send': 'Feedback senden',
    'feedback.sending': 'Wird gesendet...',
    'feedback.thanks': 'Danke für Ihr Feedback!',
    'install.title': 'BodyAtlas installieren',
    'install.desc': 'Zum Startbildschirm hinzufügen — offline verfügbar',
    'install.button': 'App installieren',
    'error.title': 'Etwas ist schief gelaufen',
    'error.message': 'Ein Fehler ist aufgetreten. Versuchen Sie die Seite zu aktualisieren.',
    'error.refresh': 'Seite aktualisieren',
    'notfound.title': 'Seite nicht gefunden',
    'notfound.message': 'Die gesuchte Seite existiert nicht.',
    'notfound.back': 'Zurück zu BodyAtlas',
  },
  fr: {
    'header.about': 'À propos',
    'header.download': 'Télécharger',
    'footer.builtBy': 'Créé par SPINAI',
    'feedback.title': 'Envoyer un commentaire',
    'feedback.placeholder': 'Comment améliorer BodyAtlas ?',
    'feedback.email': 'Email (optionnel)',
    'feedback.send': 'Envoyer',
    'feedback.sending': 'Envoi...',
    'feedback.thanks': 'Merci pour votre commentaire !',
    'install.title': 'Installer BodyAtlas',
    'install.desc': 'Ajouter à l\'écran d\'accueil — fonctionne hors ligne',
    'install.button': 'Installer l\'app',
    'error.title': 'Une erreur est survenue',
    'error.message': 'Une erreur s\'est produite. Essayez de rafraîchir la page.',
    'error.refresh': 'Rafraîchir la page',
    'notfound.title': 'Page non trouvée',
    'notfound.message': 'La page que vous cherchez n\'existe pas.',
    'notfound.back': 'Retour à BodyAtlas',
  },
};

export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('ko')) return 'ko';
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('fr')) return 'fr';
  return 'en';
}

export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let text = translations[locale]?.[key] || translations.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}
