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
  modal.contentEl
    .createEl("a", {
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
          .setIcon("box")
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
          .setIcon("box")
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
