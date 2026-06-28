// node_modules/@impro.social/impro-plugin/main.js
var SimpleUUID = class {
  constructor() {
    this._id = 0;
  }
  create() {
    return this._id++;
  }
};
var uuid = new SimpleUUID();
var callHandlers = /* @__PURE__ */ new Map();
var pendingHostCalls = /* @__PURE__ */ new Map();
function hostCall(method, ...args) {
  const hostCallId = uuid.create();
  return new Promise((resolve, reject) => {
    pendingHostCalls.set(hostCallId, { resolve, reject });
    self.postMessage({ type: "hostCall", method, hostCallId, args });
  });
}
var eventListeners = /* @__PURE__ */ new Map();
var registeredEvents = /* @__PURE__ */ new Set();
async function invokeListeners(listeners, event, args) {
  for (const listener of listeners) {
    try {
      await listener(...args);
    } catch (error) {
      console.error(`"${event}" listener threw:`, error);
    }
  }
}
async function dispatchEvent(event, args) {
  const listeners = eventListeners.get(event) ?? /* @__PURE__ */ new Set();
  switch (event) {
    case "post-context-menu":
    case "profile-context-menu": {
      const menu = new Menu();
      await invokeListeners(listeners, event, [menu, ...args]);
      return menu._serialize();
    }
    case "post-composer-open": {
      const composer = new Composer();
      await invokeListeners(listeners, event, [composer, ...args]);
      return composer._serialize();
    }
    default:
      console.warn(`No dispatch case for plugin event "${event}".`);
      return null;
  }
}
function addEventListener(event, listener) {
  let listeners = eventListeners.get(event);
  if (!listeners) {
    listeners = /* @__PURE__ */ new Set();
    eventListeners.set(event, listeners);
  }
  listeners.add(listener);
  if (!registeredEvents.has(event)) {
    registeredEvents.add(event);
    const handlerId = uuid.create();
    callHandlers.set(handlerId, (...args) => dispatchEvent(event, args));
    self.postMessage({
      type: "register",
      target: "eventListener",
      event,
      handlerId
    });
  }
}
var MenuItem = class {
  constructor() {
    this.title = "";
    this.icon = null;
    this._callback = () => {
    };
  }
  setTitle(title) {
    this.title = title;
    return this;
  }
  setIcon(icon) {
    this.icon = icon;
    return this;
  }
  onClick(callback) {
    this._callback = callback;
    return this;
  }
};
var Menu = class {
  constructor() {
    this.items = [];
  }
  addItem(builder) {
    const item = new MenuItem();
    builder(item);
    this.items.push(item);
    return this;
  }
  _serialize() {
    return this.items.map((item) => {
      const handlerId = uuid.create();
      callHandlers.set(handlerId, item._callback);
      return { title: item.title, icon: item.icon, handlerId };
    });
  }
};
var Composer = class {
  constructor() {
    this._ops = [];
    this._cursor = null;
  }
  setText(text) {
    this._ops.push({ op: "set", text: String(text) });
    return this;
  }
  appendText(text) {
    this._ops.push({ op: "append", text: String(text) });
    return this;
  }
  prependText(text) {
    this._ops.push({ op: "prepend", text: String(text) });
    return this;
  }
  setCursor(index) {
    this._cursor = index;
    return this;
  }
  _serialize() {
    return { ops: this._ops, cursor: this._cursor };
  }
};
var PluginData = class {
  getPost(uri) {
    return hostCall("getPost", { uri });
  }
  getProfile(did) {
    return hostCall("getProfile", { did });
  }
};
var App = class {
  constructor() {
    this.currentUser = null;
    this.data = new PluginData();
  }
  on(event, listener) {
    addEventListener(event, listener);
  }
  refreshFeedFilters(feedURI = null) {
    return hostCall("refreshFeedFilters", feedURI);
  }
};
var registered = false;
var Plugin = class {
  constructor() {
    this.app = new App();
  }
  addSidebarItem(icon, title, callback = () => {
  }) {
    const handlerId = uuid.create();
    callHandlers.set(handlerId, callback);
    self.postMessage({
      type: "register",
      target: "sidebarItem",
      icon,
      title,
      handlerId
    });
  }
  async loadData() {
    return hostCall("loadData");
  }
  async saveData(data) {
    await hostCall("saveData", { data });
  }
  addSettingTab(tab) {
    tab.plugin = this;
    const displayHandlerId = uuid.create();
    callHandlers.set(displayHandlerId, () => {
      tab.containerEl = new VirtualEl("div");
      tab.display();
      return tab.containerEl._serialize();
    });
    self.postMessage({
      type: "register",
      target: "settingTab",
      name: tab.name ?? null,
      displayHandlerId
    });
    this._settingTab = tab;
  }
  addFeedFilter(callback = () => {
  }) {
    const handlerId = uuid.create();
    callHandlers.set(handlerId, callback);
    self.postMessage({
      type: "register",
      target: "feedFilter",
      handlerId
    });
  }
  registerSlot(name, callback = () => null) {
    const handlerId = uuid.create();
    callHandlers.set(handlerId, async (context) => {
      const result = await callback(context);
      if (result == null) return null;
      if (!(result instanceof VirtualEl)) {
        const description = result?.constructor?.name ?? typeof result;
        throw new Error(
          `Slot "${name}" must return a VirtualEl (or null), got ${description}`
        );
      }
      return result._serialize();
    });
    self.postMessage({
      type: "register",
      target: "slot",
      name,
      handlerId
    });
  }
  onload() {
  }
  onunload() {
  }
  static register() {
    if (registered) return;
    registered = true;
    const instance = new this();
    hostCall("getCurrentUser").then((user) => {
      instance.app.currentUser = user;
      return instance.onload();
    }).then(
      () => self.postMessage({ type: "ready" }),
      (error) => self.postMessage({
        type: "ready",
        error: error?.message ?? String(error)
      })
    );
  }
};
var openModals = /* @__PURE__ */ new Map();
var Modal = class {
  constructor() {
    this._modalId = uuid.create();
    this.contentEl = new VirtualEl("div");
    this.titleEl = new VirtualEl("h2");
  }
  open() {
    if (openModals.has(this._modalId)) return;
    openModals.set(this._modalId, this);
    this.onOpen();
    self.postMessage({
      type: "hostCall",
      method: "openModal",
      args: [
        {
          modalId: this._modalId,
          title: this.titleEl._serialize(),
          content: this.contentEl._serialize()
        }
      ]
    });
  }
  close() {
    if (!openModals.has(this._modalId)) return;
    openModals.delete(this._modalId);
    self.postMessage({
      type: "hostCall",
      method: "closeModal",
      args: [{ modalId: this._modalId }]
    });
    this.onClose();
  }
  onOpen() {
  }
  onClose() {
  }
};
var IconComponent = class {
  constructor(containerEl) {
    this.el = containerEl.createEl("plugin-icon");
  }
  setIcon(name) {
    this.el.setAttr("icon", name);
    return this;
  }
};
var ProfilesListComponent = class {
  constructor(containerEl) {
    this.el = containerEl.createEl("plugin-profiles-list");
  }
  setDids(dids) {
    const value = Array.isArray(dids) ? dids.join(",") : String(dids ?? "");
    this.el.setAttr("dids", value);
    return this;
  }
  setEmptyMessage(message) {
    this.el.setAttr("empty-message", message);
    return this;
  }
};
var PostsFeedComponent = class {
  constructor(containerEl) {
    this.el = containerEl.createEl("plugin-posts-feed");
  }
  setUris(uris) {
    const value = Array.isArray(uris) ? uris.join(",") : String(uris ?? "");
    this.el.setAttr("uris", value);
    return this;
  }
  setEmptyMessage(message) {
    this.el.setAttr("empty-message", message);
    return this;
  }
};
var VirtualEl = class _VirtualEl {
  constructor(tag) {
    this.tag = tag;
    this.attrs = {};
    this.text = null;
    this.children = [];
    this.events = {};
  }
  onClick(fn) {
    const handlerId = uuid.create();
    callHandlers.set(handlerId, fn);
    this.events.click = handlerId;
    return this;
  }
  onChange(fn) {
    const handlerId = uuid.create();
    callHandlers.set(handlerId, fn);
    this.events.change = handlerId;
    return this;
  }
  onInput(fn) {
    const handlerId = uuid.create();
    callHandlers.set(handlerId, fn);
    this.events.input = handlerId;
    return this;
  }
  setText(text) {
    this.text = text;
    this.children = [];
    return this;
  }
  empty() {
    this.text = null;
    this.children = [];
    return this;
  }
  addClass(cls) {
    this.attrs.class = this.attrs.class ? `${this.attrs.class} ${cls}` : cls;
    return this;
  }
  setAttr(name, value) {
    this.attrs[name] = value === void 0 ? "" : value;
    return this;
  }
  createEl(tag, options = {}, callback) {
    const child = new _VirtualEl(tag);
    if (options.text != null) child.text = options.text;
    if (options.cls) {
      child.attrs.class = Array.isArray(options.cls) ? options.cls.join(" ") : options.cls;
    }
    if (options.attr) Object.assign(child.attrs, options.attr);
    this.children.push(child);
    if (typeof callback === "function") callback(child);
    return child;
  }
  createDiv(options = {}, callback) {
    return this.createEl("div", options, callback);
  }
  createSpan(options = {}, callback) {
    return this.createEl("span", options, callback);
  }
  createProfilesList(callback) {
    const component = new ProfilesListComponent(this);
    if (typeof callback === "function") callback(component);
    return component;
  }
  createPostsFeed(callback) {
    const component = new PostsFeedComponent(this);
    if (typeof callback === "function") callback(component);
    return component;
  }
  createIcon(callback) {
    const component = new IconComponent(this);
    if (typeof callback === "function") callback(component);
    return component;
  }
  _serialize() {
    return {
      tag: this.tag,
      attrs: this.attrs,
      text: this.text,
      children: this.children.map((child) => child._serialize()),
      events: this.events
    };
  }
};
self.onmessage = async (event) => {
  const message = event.data;
  if (!message || typeof message !== "object") return;
  if (message.type === "call") {
    const fn = callHandlers.get(message.handlerId);
    if (!fn) {
      self.postMessage({
        type: "result",
        callId: message.callId,
        error: `unknown handler ${message.handlerId}`
      });
      return;
    }
    try {
      const value = await fn(...message.args);
      self.postMessage({ type: "result", callId: message.callId, value });
    } catch (error) {
      self.postMessage({
        type: "result",
        callId: message.callId,
        error: error.message ?? String(error)
      });
    }
    return;
  }
  if (message.type === "hostResult") {
    const pending = pendingHostCalls.get(message.hostCallId);
    if (!pending) return;
    pendingHostCalls.delete(message.hostCallId);
    if (message.error) pending.reject(new Error(message.error));
    else pending.resolve(message.value);
    return;
  }
  if (message.type === "event") {
    switch (message.event) {
      case "modalDismissed": {
        const modal = openModals.get(message.data.modalId);
        if (modal) {
          openModals.delete(message.data.modalId);
          modal.onClose();
        }
        return;
      }
    }
    return;
  }
};

// src/main.js
var PDSLS_BASE = "https://pdsls.dev/";
function pdslsForUri(atUri) {
  return PDSLS_BASE + String(atUri);
}
function pdslsForRepo(did) {
  return PDSLS_BASE + "at://" + String(did);
}
function openPdslsModal(app, { title, url, atUri }) {
  const modal = new Modal();
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
var OpenInPdslsPlugin = class extends Plugin {
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
      const wrap = new VirtualEl("div");
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
