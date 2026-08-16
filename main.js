// src/main.js
var import_impro_plugin = require("@impro.social/impro-plugin");
var PDSLS_BASE = "https://pdsls.dev/";
function pdslsForUri(atUri) {
  return PDSLS_BASE + String(atUri);
}
function pdslsForRepo(did) {
  return PDSLS_BASE + "at://" + String(did);
}
function openPdslsModal(app, { title, url, atUri }) {
  const modal = new import_impro_plugin.Modal();
  modal.titleEl.setText("Open in PDSls");
  modal.contentEl.createEl("p", {
    cls: "open-in-pdsls-desc",
    text: title
  });
  modal.contentEl.createEl("code", {
    cls: "open-in-pdsls-uri",
    text: atUri
  });
  modal.contentEl.createEl("a", {
    cls: "open-in-pdsls-link rounded-button rounded-button-primary",
    text: "Open in PDSls \u2197",
    attr: { href: url }
  });
  modal.open();
}
var OpenInPdslsPlugin = class extends import_impro_plugin.Plugin {
  onload() {
    this.app.on("post-context-menu", (menu, post) => {
      const uri = post?.uri;
      if (!uri) return;
      menu.addItem(
        (item) => item.setTitle("\u{1F50D} Open in PDSls").setIcon("box").onClick(
          () => openPdslsModal(this.app, {
            title: "View the raw atproto record for this post:",
            url: pdslsForUri(uri),
            atUri: uri
          })
        )
      );
    });
    this.app.on("profile-context-menu", (menu, profile) => {
      const did = profile?.did;
      if (!did) return;
      menu.addItem(
        (item) => item.setTitle("\u{1F50D} Open in PDSls").setIcon("box").onClick(
          () => openPdslsModal(this.app, {
            title: "Browse this account's atproto repository:",
            url: pdslsForRepo(did),
            atUri: "at://" + did
          })
        )
      );
    });
    this.registerSlot("post-thread-view:after-main", (context) => {
      const uri = context?.uri;
      if (!uri) return null;
      const wrap = new import_impro_plugin.VirtualEl("div");
      wrap.addClass("open-in-pdsls-inline");
      wrap.createEl("a", {
        cls: "open-in-pdsls-inline-link",
        text: "\u{1F50D} Open in PDSls \u2197",
        attr: { href: pdslsForUri(uri) }
      });
      return wrap;
    });
  }
};
OpenInPdslsPlugin.register();
