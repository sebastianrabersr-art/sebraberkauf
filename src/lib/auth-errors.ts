/**
 * Übersetzt Fehlermeldungen von Supabase Auth bzw. dem OAuth-Broker in
 * verständliches Deutsch – mit dem, was die Person als Nächstes tun kann.
 */
const RULES: [RegExp, string][] = [
  [/invalid login credentials/i, "E-Mail oder Passwort stimmen nicht. Prüf beides noch einmal – oder setz dein Passwort zurück."],
  [/email not confirmed/i, "Bitte bestätige zuerst deine E-Mail-Adresse. Den Link dazu findest du in deinem Postfach."],
  [/user already registered|already been registered/i, "Mit dieser E-Mail gibt es schon ein Konto. Melde dich einfach an."],
  [/password should be at least|password is too short/i, "Dein Passwort braucht mindestens 8 Zeichen."],
  [/weak password|password is known to be weak|pwned/i, "Dieses Passwort ist zu leicht zu erraten. Wähl bitte ein anderes."],
  [/unable to validate email|invalid email|email address .* is invalid/i, "Diese E-Mail-Adresse sieht nicht gültig aus."],
  [/rate limit|too many requests|security purposes/i, "Zu viele Versuche in kurzer Zeit. Warte bitte einen Moment und versuch es dann noch einmal."],
  [/same password|different from the old password/i, "Das neue Passwort muss sich vom alten unterscheiden."],
  [/token has expired|otp_expired|expired/i, "Dieser Link ist abgelaufen. Fordere bitte einen neuen an."],
  [/sign in was cancelled|popup was blocked/i, "Die Anmeldung mit Google wurde abgebrochen."],
  [/failed to fetch|network/i, "Keine Verbindung zum Server. Prüf deine Internetverbindung und versuch es erneut."],
];

export function authErrorMessage(err: unknown, fallback = "Das hat leider nicht geklappt. Bitte versuch es noch einmal."): string {
  const raw = typeof err === "string" ? err : (err as { message?: string } | null)?.message ?? "";
  if (!raw) return fallback;
  for (const [re, msg] of RULES) if (re.test(raw)) return msg;
  return fallback;
}
