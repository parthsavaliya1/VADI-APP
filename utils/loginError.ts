import { router } from "expo-router";
import { showAlert } from "../context/CustomAlertContext";

/** Give login failures a visible recovery action on both login screens. */
export function showLoginError(error: unknown) {
  const message = error instanceof Error ? error.message : "Could not send OTP. Please try again.";

  if (/account not found/i.test(message)) {
    showAlert(
      "Create an account first",
      "This mobile number is not registered. Please create an account before logging in.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Create account", onPress: () => router.push("/(auth)/signup") },
      ],
    );
    return;
  }

  showAlert("Unable to log in", message);
}