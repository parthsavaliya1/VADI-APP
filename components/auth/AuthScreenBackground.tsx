import { Image as ExpoImage } from "expo-image";
import { StyleSheet, View } from "react-native";
import {
  AUTH_LEAF_DISPLAY_WIDTH,
  SCREEN_WIDTH,
  leafImageHeight,
} from "../../constants/authScreenTheme";

type Props = {
  farmBandHeight: number;
};

/**
 * Shared login/signup decoration: farm PNG strip, seam blend, leaves PNG.
 */
export function AuthScreenBackground({ farmBandHeight }: Props) {
  const leafH = leafImageHeight();

  return (
    <>
      <View
        style={[styles.bgFarmClip, { height: farmBandHeight }]}
        pointerEvents="none"
      >
        {/* Same idea as leaves: PNG has transparent sky (see process-auth-bg-assets.mjs) */}
        <ExpoImage
          source={require("../../assets/images/auth-bg-farm.png")}
          contentFit="contain"
          contentPosition="bottom"
          cachePolicy="memory-disk"
          style={[styles.bgFarmImage, { height: farmBandHeight }]}
        />
      </View>
      <View style={styles.bgLeavesClip} pointerEvents="none">
        <ExpoImage
          source={require("../../assets/images/auth-bg-leaves.png")}
          contentFit="contain"
          cachePolicy="memory-disk"
          style={{
            width: AUTH_LEAF_DISPLAY_WIDTH,
            height: leafH,
          }}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bgFarmClip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH,
    overflow: "hidden",
    zIndex: 0,
  },
  bgFarmImage: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: SCREEN_WIDTH,
  },
  bgLeavesClip: {
    position: "absolute",
    top: 4,
    right: -6,
    zIndex: 1,
    overflow: "hidden",
  },
});
