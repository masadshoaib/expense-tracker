const { withXcodeProject, withInfoPlist, IOSConfig } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const INTENT_FILENAME = "LogExpenseIntent.swift";

// The Swift AppIntent code — mirrors MonAI's pattern:
// 1. An intent that accepts amount + merchant as typed parameters
// 2. Opens the app via URL scheme with those params pre-filled
const SWIFT_CODE = `import AppIntents
import UIKit

// Appears in Shortcuts as "Log Expense in Spent"
// User wires: Wallet automation → this intent (amount + merchant as variables)
@available(iOS 16.0, *)
struct LogExpenseIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Expense in Spent"
    static var description = IntentDescription("Open Spent pre-filled with an amount and merchant name. Use this in a Wallet automation to log expenses hands-free.")

    @Parameter(title: "Amount", description: "The expense amount (e.g. 12.50)")
    var amount: Double

    @Parameter(title: "Merchant", description: "Merchant or description (e.g. Careem, Starbucks)")
    var merchant: String

    @MainActor
    func perform() async throws -> some IntentResult {
        let amountStr = String(format: "%.2f", amount)
        let encoded = merchant.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? merchant
        let urlString = "spent://capture?amount=\\(amountStr)&description=\\(encoded)"
        if let url = URL(string: urlString) {
            UIApplication.shared.open(url)
        }
        return .result()
    }
}

// AppShortcutsProvider makes the intent discoverable without user setup
@available(iOS 16.4, *)
struct SpentShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: LogExpenseIntent(),
            phrases: ["Log expense in \\(.applicationName)", "Add expense to \\(.applicationName)"],
            shortTitle: "Log Expense",
            systemImageName: "dollarsign.circle"
        )
    }
}
`;

const withAppIntents = (config) => {
  // Step 1: write the Swift file into the iOS project folder
  config = withXcodeProject(config, (mod) => {
    const projectRoot = mod.modRequest.projectRoot;
    const iosDir = path.join(projectRoot, "ios", "ExpenseTracker");
    const swiftPath = path.join(iosDir, INTENT_FILENAME);

    fs.writeFileSync(swiftPath, SWIFT_CODE, "utf8");

    // Add the file to the Xcode project so it compiles
    const proj = mod.modResults;
    const groupName = "ExpenseTracker";
    const groups = proj.hash.project.objects.PBXGroup;

    // Find the main app group
    let mainGroupKey = null;
    for (const [key, group] of Object.entries(groups)) {
      if (group.name === groupName || group.path === groupName) {
        mainGroupKey = key;
        break;
      }
    }

    if (mainGroupKey) {
      // Check if already added
      const existing = Object.values(proj.hash.project.objects.PBXFileReference || {}).find(
        (f) => f && f.path === INTENT_FILENAME
      );

      if (!existing) {
        proj.addSourceFile(
          `${groupName}/${INTENT_FILENAME}`,
          { target: proj.getFirstTarget().uuid },
          mainGroupKey
        );
      }
    }

    return mod;
  });

  // Step 2: add NSUserActivityTypes so iOS recognises our intents
  config = withInfoPlist(config, (mod) => {
    const bundleId = mod.ios?.bundleIdentifier ?? "com.asadshoaib.expensetracker";
    const existing = mod.modResults.NSUserActivityTypes ?? [];
    const intentEntry = `${bundleId}.LogExpenseIntent`;
    if (!existing.includes(intentEntry)) {
      mod.modResults.NSUserActivityTypes = [...existing, intentEntry];
    }
    return mod;
  });

  return config;
};

module.exports = withAppIntents;
