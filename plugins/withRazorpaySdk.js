const { withProjectBuildGradle } = require("expo/config-plugins");

const STANDARD_CORE_VERSION = "1.7.18";
const BEGIN = "// @generated begin vadi-razorpay-sdk";
const END = "// @generated end vadi-razorpay-sdk";

/** Keep the Android fix in source because EAS regenerates the ignored android folder. */
function applyRazorpaySdkPin(source) {
  const begin = source.indexOf(BEGIN);
  if (begin !== -1) {
    const end = source.indexOf(END, begin);
    if (end === -1) throw new Error("Incomplete VADI Razorpay Gradle block");
    source = source.slice(0, begin) + source.slice(end + END.length);
  }
  return source.trimEnd() + `

${BEGIN}
// react-native-razorpay 2.3.1 pins standard-core 1.7.1, whose namespace collides
// with core 1.0.1 under AGP 9. Use the SDK with its corrected library namespace.
allprojects {
    configurations.configureEach {
        resolutionStrategy.eachDependency { details ->
            if (details.requested.group == 'com.razorpay' && details.requested.name == 'standard-core') {
                details.useVersion '${STANDARD_CORE_VERSION}'
                details.because 'Distinct Razorpay library namespaces required by Android Gradle Plugin 9'
            }
        }
    }
}
${END}
`;
}

function withRazorpaySdk(config) {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language !== "groovy") throw new Error("VADI Razorpay plugin requires Groovy build.gradle");
    mod.modResults.contents = applyRazorpaySdkPin(mod.modResults.contents);
    return mod;
  });
}

module.exports = withRazorpaySdk;
module.exports.applyRazorpaySdkPin = applyRazorpaySdkPin;
module.exports.STANDARD_CORE_VERSION = STANDARD_CORE_VERSION;
