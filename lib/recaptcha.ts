import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import type { MutableRefObject } from "react";

let recaptchaRef: MutableRefObject<FirebaseRecaptchaVerifierModal | null> | null =
  null;

export const setRecaptchaRef = (
  ref: MutableRefObject<FirebaseRecaptchaVerifierModal | null>,
) => {
  recaptchaRef = ref;
};

export const getRecaptchaRef = () => recaptchaRef;
