const emailEn = {
  invitationSubject: "You've been invited",
  invitationPreview: 'Set your password to activate your account',
  invitationTitle: 'Accept your invitation',
  invitationBody:
    "You've been invited. Use the button below to set your password and activate your account.",
  invitationCta: 'Accept invitation',
  invitationExpires: 'This invitation link expires {{expiresAt}}.',
  loginOtpSubject: 'Your sign-in code',
  loginOtpPreview: 'Expires in {{minutes}} minutes',
  loginOtpTitle: 'Verify your sign-in',
  loginOtpBody:
    'Enter the verification code below to complete sign-in. Do not share this code with anyone.',
  loginOtpLabel: 'Verification code',
  loginOtpDivider: 'Or enter this code',
  loginOtpSignInCta: 'Continue sign-in',
  loginOtpExpires: 'This code expires in {{minutes}} minutes.',
  resetPasswordSubject: 'Reset your password',
  resetPasswordPreview: 'Use the link in this email only if you requested a reset',
  resetPasswordTitle: 'Password reset requested',
  resetPasswordBody:
    'We received a request to reset the password for your account. If you made this request, continue below. Otherwise, you can ignore this email.',
  resetPasswordCta: 'Continue to reset password',
  resetPasswordExpires: 'This reset link expires {{expiresAt}}.',
  setPasswordSubject: 'Create your password',
  setPasswordPreview: 'Choose a password to sign in with email',
  setPasswordTitle: 'Create your password',
  setPasswordBody:
    'You need a password to sign in with email. Use the button below to create one for your account.',
  setPasswordCta: 'Create password',
  setPasswordExpires: 'This link expires {{expiresAt}}.',
  footerLine:
    'This message was sent automatically. If you did not expect it, no action is required.',
}

const emailPl = {
  invitationSubject: 'Masz zaproszenie',
  invitationPreview: 'Ustaw hasło, aby aktywować konto',
  invitationTitle: 'Zaakceptuj zaproszenie',
  invitationBody:
    'Zostałeś zaproszony. Użyj przycisku poniżej, aby ustawić hasło i aktywować konto.',
  invitationCta: 'Akceptuj zaproszenie',
  invitationExpires: 'Link wygasa {{expiresAt}}.',
  loginOtpSubject: 'Kod logowania',
  loginOtpPreview: 'Wygasa za {{minutes}} min',
  loginOtpTitle: 'Potwierdź logowanie',
  loginOtpBody: 'Wpisz kod poniżej, aby dokończyć logowanie. Nie udostępniaj tego kodu nikomu.',
  loginOtpLabel: 'Kod weryfikacyjny',
  loginOtpDivider: 'Lub wpisz ten kod',
  loginOtpSignInCta: 'Kontynuuj logowanie',
  loginOtpExpires: 'Kod wygasa za {{minutes}} min.',
  resetPasswordSubject: 'Reset hasła',
  resetPasswordPreview: 'Kontynuuj tylko, jeśli to Ty prosiłeś o reset',
  resetPasswordTitle: 'Prośba o reset hasła',
  resetPasswordBody:
    'Otrzymaliśmy prośbę o reset hasła. Jeśli to Ty — kontynuuj poniżej. W przeciwnym razie zignoruj wiadomość.',
  resetPasswordCta: 'Kontynuuj reset hasła',
  resetPasswordExpires: 'Link resetu wygasa {{expiresAt}}.',
  setPasswordSubject: 'Utwórz hasło',
  setPasswordPreview: 'Wybierz hasło do logowania e-mailem',
  setPasswordTitle: 'Utwórz hasło',
  setPasswordBody:
    'Potrzebujesz hasła do logowania e-mailem. Użyj przycisku poniżej, aby je utworzyć.',
  setPasswordCta: 'Utwórz hasło',
  setPasswordExpires: 'Link wygasa {{expiresAt}}.',
  footerLine:
    'Wiadomość wysłana automatycznie. Jeśli się jej nie spodziewałeś, nie musisz nic robić.',
}

const emailDe = {
  invitationSubject: 'Sie wurden eingeladen',
  invitationPreview: 'Passwort setzen, um Ihr Konto zu aktivieren',
  invitationTitle: 'Einladung annehmen',
  invitationBody:
    'Sie wurden eingeladen. Nutzen Sie die Schaltfläche unten, um ein Passwort zu setzen und Ihr Konto zu aktivieren.',
  invitationCta: 'Einladung annehmen',
  invitationExpires: 'Der Link läuft ab am {{expiresAt}}.',
  loginOtpSubject: 'Ihr Anmeldecode',
  loginOtpPreview: 'Läuft in {{minutes}} Minuten ab',
  loginOtpTitle: 'Anmeldung bestätigen',
  loginOtpBody:
    'Geben Sie den Code unten ein, um die Anmeldung abzuschließen. Teilen Sie den Code mit niemandem.',
  loginOtpLabel: 'Bestätigungscode',
  loginOtpDivider: 'Oder diesen Code eingeben',
  loginOtpSignInCta: 'Anmeldung fortsetzen',
  loginOtpExpires: 'Der Code läuft in {{minutes}} Minuten ab.',
  resetPasswordSubject: 'Passwort zurücksetzen',
  resetPasswordPreview: 'Nur fortfahren, wenn Sie das angefordert haben',
  resetPasswordTitle: 'Passwort-Reset angefordert',
  resetPasswordBody:
    'Wir haben eine Anfrage zum Zurücksetzen erhalten. Wenn Sie das waren, fahren Sie unten fort. Andernfalls ignorieren Sie diese E-Mail.',
  resetPasswordCta: 'Passwort zurücksetzen',
  resetPasswordExpires: 'Der Link läuft ab am {{expiresAt}}.',
  setPasswordSubject: 'Passwort erstellen',
  setPasswordPreview: 'Passwort für die E-Mail-Anmeldung wählen',
  setPasswordTitle: 'Passwort erstellen',
  setPasswordBody:
    'Sie benötigen ein Passwort für die E-Mail-Anmeldung. Nutzen Sie die Schaltfläche unten.',
  setPasswordCta: 'Passwort erstellen',
  setPasswordExpires: 'Der Link läuft ab am {{expiresAt}}.',
  footerLine:
    'Diese Nachricht wurde automatisch gesendet. Wenn Sie sie nicht erwartet haben, ist keine Aktion nötig.',
}

/** Nested under `translations.<locale>.iam.email` — keys `iam:email:<suffix>`. */
export const iamEmailTranslationTrees = {
  en: emailEn,
  pl: emailPl,
  de: emailDe,
} as const
