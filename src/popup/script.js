function init() {
  browser.storage.local.get((data) => {
    document.manager.profile.value = data.defaultProfile;
    defaultProfile = data.defaultProfile;
    loadProfileList(data);

    if (typeof data.rules != "object") {
      data.rules = {};
    }

    browser.tabs.query(
      {
        active: true,
        currentWindow: true,
      },
      (tabs) => {
        if (typeof tabs[0].url == "undefined") {
          renderForGeneral();
          loadProfile(defaultProfile);

          // Check if a content script is running on this tab
          // If there is, then show the tab permission warning
          if (runningOn == browsers.FIREFOX) {
            browser.runtime.sendMessage(
              {
                action: "isTabConnectedToPort",
                tabId: tabs[0].id,
              },
              (response) => {
                if (response) {
                  document
                    .getElementById("grantPermissionError")
                    .classList.remove("hide");
                }
              }
            );
          }
        } else {
          renderForUrl(new URL(tabs[0].url), data.rules);
        }

        refreshSetAsDefaultButton();
      }
    );
  });
}

/**
 * Preload data for the specific URL
 * @param {URL} url
 * @param {Object} rules
 */
function renderForUrl(url, rules) {
  if (url.protocol == "file:") {
    renderForLocalFile();
    return;
  }

  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  if (!domainRegex.test(url.hostname)) {
    renderForGeneral();
    return;
  }

  ruleForDomain = url.hostname;
  let usingRule = null;
  let selectedDomain;

  if (rules[url.hostname]) {
    usingRule = rules[url.hostname];
    selectedDomain = url.hostname;
  } else {
    const subdomains = url.hostname.split(".");
    subdomains[subdomains.length - 2] += "." + subdomains.pop();

    do {
      subdomains[0] = "*";
      const subdomain = subdomains.join(".");

      if (rules[subdomain]) {
        usingRule = rules[subdomain];
        selectedDomain = subdomain;
        break;
      }

      subdomains.shift();
    } while (subdomains.length > 1);
  }

  if (usingRule != null && usingRule != "default") {
    usingRule = usingRule.split("_")[1];
    document.manager.profile.value = usingRule;

    if (
      !document.manager.profile.options[document.manager.profile.selectedIndex]
    ) {
      console.error(
        'Scrollbar "%s" cannot be loaded from storage for rule "%s". Using default Scrollbar.',
        `profile_${usingRule}`,
        selectedDomain
      );
      usingRule = "default";
      currentRule = defaultProfile;
      document.manager.profile.value = usingRule;
    } else {
      displayInheritanceDetails(selectedDomain);
      currentRule = usingRule;
    }

    loadProfile(currentRule);
  } else {
    displayInheritanceDetails("none");
    currentRule = "default";
    loadProfile(defaultProfile);
  }
}

/**
 * Preload data for local file setting
 */
function renderForLocalFile() {
  browser.storage.local.get("localFileProfile", (data) => {
    if (
      typeof data.localFileProfile == "number" &&
      data.localFileProfile != null
    ) {
      currentRule = data.localFileProfile;
      loadProfile(data.localFileProfile);
    } else {
      currentRule = "default";
      loadProfile(defaultProfile);
    }

    isLocalFile = true;
    document.body.classList.add("local-file");
    document.manager.profile.value = currentRule;
    displayInheritanceDetails("none");
    refreshSetAsDefaultButton();
  });
}

/**
 * Disable website-specific edits
 */
function renderForGeneral() {
  const useButton = document.getElementById("button-use");
  useButton.parentNode.removeChild(useButton);

  document.manager.profile.removeChild(document.manager.profile.firstChild);
  document.manager.profile.value = defaultProfile;

  loadProfile(defaultProfile);
}

/**
 * Load list of profiles from Storage API
 * @param {Object} data
 */

/**
 * Handle profile selection drop-down menu change
 */
function changeSelectedProfile() {
  if (document.manager.profile.value == "default") {
    loadProfile(defaultProfile);
  } else {
    loadProfile(document.manager.profile.value);
  }
  refreshSetAsDefaultButton();
}

/**
 * Toggle "Set as default" button
 */
function refreshSetAsDefaultButton() {
  document.getElementById("button-setDefault").disabled =
    defaultProfile == document.manager.profile.value ||
    document.manager.profile.value == "default";
  if (document.getElementById("button-use"))
    document.getElementById("button-use").disabled =
      !ruleInherit && currentRule == document.manager.profile.value;
}

/**
 * Update the default profile
 */
function setAsDefault() {
  browser.storage.local.set(
    {
      defaultProfile: document.manager.profile.value,
    },
    () => {
      browser.storage.local.get(init);
    }
  );
}

/**
 * Save rule to Storage API
 */
function updateRule() {
  if (isLocalFile) {
    const profile = parseInt(document.manager.profile.value);
    const data = {
      localFileProfile: !isNaN(profile) ? profile : null,
    };
    browser.storage.local.set(data, () => {
      browser.storage.local.get(init);
    });
  } else {
    browser.storage.local.get("rules", (data) => {
      if (!data.rules) {
        data.rules = {};
      }

      if (document.manager.profile.value == "default") {
        if (ruleInherit) {
          data.rules[ruleForDomain] = "default";
        } else {
          delete data.rules[ruleForDomain];
        }
      } else {
        data.rules[ruleForDomain] = `profile_${document.manager.profile.value}`;
      }

      browser.storage.local.set(data, () => {
        browser.storage.local.get(init);
      });
    });
  }
}

/**
 * Show the what's new button (if required)
 */
function showWhatsNew() {
  const whatsNewButton = document.getElementById("whatsnew");

  browser.storage.local.get("showWhatsNew", (data) => {
    if (data.showWhatsNew) {
      whatsNewButton.classList.remove("hide");
    } else {
      whatsNewButton.classList.add("hide");
    }
  });
}

/**
 * Prompt user to grant tabs permission
 */
function askForTabsPermission() {
  browser.permissions.request(
    {
      permissions: ["tabs"],
    },
    (granted) => {
      if (granted) {
        console.warn('User has not granted "tabs" permission.');
        document.getElementById("grantPermissionError").classList.add("hide");
        browser.storage.local.get(init);
      }
    }
  );
}
