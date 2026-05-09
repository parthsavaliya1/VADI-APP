import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type PopupButtonStyle = "default" | "cancel" | "destructive";

export type PopupButton = {
  text: string;
  onPress?: () => void;
  style?: PopupButtonStyle;
};

type PopupRequest = {
  title: string;
  message?: string;
  buttons?: PopupButton[];
};

type PopupHandler = (request: PopupRequest) => void;

let popupHandler: PopupHandler | null = null;

const defaultButton: PopupButton = { text: "OK" };

export function showAlert(title: string, message?: string, buttons?: PopupButton[]) {
  const request: PopupRequest = { title, message, buttons };

  if (popupHandler) {
    popupHandler(request);
    return;
  }

  // If provider is not mounted yet, silently no-op fallback is avoided.
  console.warn("Custom popup provider is not mounted yet.", request);
}

export function CustomAlertProvider({ children }: { children: ReactNode }) {
  const [currentPopup, setCurrentPopup] = useState<PopupRequest | null>(null);

  useEffect(() => {
    popupHandler = setCurrentPopup;
    return () => {
      popupHandler = null;
    };
  }, []);

  const buttons = useMemo(() => {
    if (!currentPopup) return [];
    return currentPopup.buttons && currentPopup.buttons.length > 0
      ? currentPopup.buttons
      : [defaultButton];
  }, [currentPopup]);

  const closePopup = (button?: PopupButton) => {
    setCurrentPopup(null);
    button?.onPress?.();
  };

  return (
    <>
      {children}

      <Modal
        visible={!!currentPopup}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => closePopup()}>
          <Pressable style={styles.popupCard} onPress={() => {}}>
            <View style={styles.badgeRow}>
              <View style={styles.badge} />
            </View>

            <Text style={styles.title}>{currentPopup?.title}</Text>
            {!!currentPopup?.message && (
              <Text style={styles.message}>{currentPopup.message}</Text>
            )}

            <View style={styles.buttonGroup}>
              {buttons.map((button, index) => {
                const isDestructive = button.style === "destructive";
                const isCancel = button.style === "cancel";

                return (
                  <TouchableOpacity
                    key={`${button.text}-${index}`}
                    style={[
                      styles.button,
                      isDestructive && styles.destructiveButton,
                      isCancel && styles.cancelButton,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => closePopup(button)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isDestructive && styles.destructiveButtonText,
                        isCancel && styles.cancelButtonText,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  popupCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 8,
  },
  badgeRow: {
    alignItems: "center",
    marginBottom: 10,
  },
  badge: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#DDE8D8",
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: "#1B5E20",
    textAlign: "center",
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563",
    textAlign: "center",
  },
  buttonGroup: {
    marginTop: 18,
    gap: 10,
  },
  button: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  cancelButton: {
    backgroundColor: "#EEF2F6",
  },
  destructiveButton: {
    backgroundColor: "#FEECEE",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelButtonText: {
    color: "#374151",
  },
  destructiveButtonText: {
    color: "#DC2626",
  },
});
