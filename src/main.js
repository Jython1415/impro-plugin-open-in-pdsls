import { Plugin, Modal, VirtualEl } from "@impro.social/impro-plugin";

// PDSls renders any at:// identifier straight from the source PDS:
//   record  -> https://pdsls.dev/at://<did>/<collection>/<rkey>
//   repo    -> https://pdsls.dev/at://<did>
const PDSLS_BASE = "https://pdsls.dev/";

function pdslsForUri(atUri) {
  return PDSLS_BASE + String(atUri);
}
function pdslsForRepo(did) {
  return PDSLS_BASE + "at://" + String(did);
}

// PDSls logo mark, from https://github.com/notjuliet/pdsls/blob/main/public/pdsls-logo.svg
function pdslsLogoIcon() {
  const svg = new VirtualEl("svg");
  svg.setAttr("viewBox", "0 0 24 24");
  svg.setAttr("width", "20");
  svg.setAttr("height", "20");
  svg.setAttr("role", "img");
  svg.setAttr("aria-label", "PDSls logo");
  svg.createEl("path", {
    attr: {
      fill: "currentColor",
      d: "M14 1a3 3 0 0 1 2.348 4.868l2 3.203Q18.665 9 19 9a3 3 0 1 1-2.347 1.132l-2-3.203a3 3 0 0 1-1.304 0l-2.001 3.203c.408.513.652 1.162.652 1.868s-.244 1.356-.653 1.868l2.002 3.203Q13.664 17 14 17a3 3 0 1 1-2.347 1.132L9.65 14.929a3 3 0 0 1-1.302 0l-2.002 3.203a3 3 0 1 1-1.696-1.06l2.002-3.204A3 3 0 0 1 9.65 9.07l2.002-3.202A3 3 0 0 1 14 1",
    },
  });
  return svg;
}

// The plugin worker has no `window`, so it cannot navigate on its own. The only
// way to open a URL is for the user to click a host-rendered <a>, which the host
// forces to target="_blank" + rel="noopener" and routes through its external-link
// confirmation. So a context-menu action opens a tiny modal containing that link.
function openPdslsModal(app, { title, url, atUri }) {
  const modal = new Modal();
  modal.titleEl.setText("Open in PDSls");

  modal.contentEl.createEl("p", {
    cls: "open-in-pdsls-desc",
    text: title,
  });
  modal.contentEl.createEl("code", {
    cls: "open-in-pdsls-uri",
    text: atUri,
  });
  modal.contentEl.createEl("a", {
    cls: "open-in-pdsls-link rounded-button rounded-button-primary",
    text: "Open in PDSls \u2197",
    attr: { href: url },
  });

  modal.open();
}

class OpenInPdslsPlugin extends Plugin {
  onload() {
    // 1) Post context menu — works anywhere a post appears (feed, thread, etc.)
    this.app.on("post-context-menu", (menu, post) => {
      const uri = post?.uri;
      if (!uri) return;
      menu.addItem((item) =>
        item
          .setTitle("Open in PDSls")
          .setIcon(pdslsLogoIcon())
          .onClick(() =>
            openPdslsModal(this.app, {
              title: "View the raw atproto record for this post:",
              url: pdslsForUri(uri),
              atUri: uri,
            }),
          ),
      );
    });

    // 2) Profile context menu — opens the account's repo root.
    this.app.on("profile-context-menu", (menu, profile) => {
      const did = profile?.did;
      if (!did) return;
      menu.addItem((item) =>
        item
          .setTitle("Open in PDSls")
          .setIcon(pdslsLogoIcon())
          .onClick(() =>
            openPdslsModal(this.app, {
              title: "Browse this account's atproto repository:",
              url: pdslsForRepo(did),
              atUri: "at://" + did,
            }),
          ),
      );
    });

    // 3) One-click inline link in the thread view, beneath the focused post.
    this.registerSlot("post-thread-view:after-main", (context) => {
      const uri = context?.uri;
      if (!uri) return null;
      const wrap = new VirtualEl("div");
      wrap.addClass("open-in-pdsls-inline");
      wrap.createEl("a", {
        cls: "open-in-pdsls-inline-link",
        text: "\u{1F50D} Open in PDSls \u2197",
        attr: { href: pdslsForUri(uri) },
      });
      return wrap;
    });
  }
}

OpenInPdslsPlugin.register();
