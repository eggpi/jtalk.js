function JTalk(server, user, password) {
    // namespace for chat states
    Strophe.NS.CHATSTATE = "http://jabber.org/protocol/chatstates";

    var connection = new Strophe.Connection(server);

    /* Get the chat with a given contact, creating it if it doesn't exist and
     * 'create' is enabled (default: true).
     * When the chat window is first created, triggers the "new chat window"
     * hook.
     */
    var _active_chats = {};
    function chat(contact, create) {
        /* Create the chat windows' elements */
        function createChatWindow() {
            // create the element
            var window_markup = [
                "<div class='ui-jtalk-chat-window'>",
                    "<div class='ui-jtalk-chat-history'></div>",
                    "<div class='ui-jtalk-chat-state'></div>",
                    "<div class='ui-jtalk-chat-textwrapper'>",
                        "<textarea class='ui-jtalk-chat-input'></textarea>",
                    "</div>",
            ];

            return $(window_markup.join("")).get();
        }

        /* Build a handler for keydown events in the window's text area. */
        function keydownHandler(_self) {
            return function(e) {
                var message = $(this).val();

                if (e.which == 13) {
                    // return key pressed -- send message
                    $(this).val("");

                    _self._sendMessage(message, "active");
                    _self._addMessageToHistory("me", message);

                    return false;
                }

                if (e.which > 31 && !message &&
                    _self._chatstate != "composing") {
                    // send composing chat status, but only if this is
                    // the first keypress of a printable character
                    _self._sendMessage(null, "composing");
                }

                return true;
            }
        }

        /* Build a handler for keyup events in the window's text area. */
        function keyupHandler(_self) {
            return function(e) {
                if (!$(this).val() &&
                    _self._chatstate != "active") {
                    _self._sendMessage(null, "active");
                }

                return true;
            }
        }

        // the real constructor, out of sight
        function _chat(contact) {
            this.contact = contact;
            this.element = createChatWindow();

            this._chatstate = null;
            this._last_from = null;

            if (!trigger("new chat window", this)) {
                $(document.body).append(this.element);
            }

            /* Unregister this chat.
             * A new window will be created for subsequent messages.
             */
            this.unregister = function() {
                // leave window cleanup to the user
                delete _active_chats[this.contact];
            }

            /* Send a message with chatstate support */
            this._sendMessage = function(message, chatstate) {
                var stanza = $msg({to: this.contact, from: user, type: "chat"});

                if (message !== null) stanza.c("body", message);
                if (chatstate !== null) {
                    this._chatstate = chatstate;
                    stanza.c(chatstate, {xmlns: Strophe.NS.CHATSTATE});
                }

                connection.send(stanza);
            }

            /* Display a message sent by 'from' in the history. */
            this._addMessageToHistory = function (from, msg) {
                // suppress 'from' if the sender is the same as before
                if (from == this._last_from) from = null;
                else this._last_from = from;

                // build entry for the history
                var entry = $("<p>");
                if (from) {
                    var span = $("<span class='ui-jtalk-chat-history-from'>");
                    span.append(from + ":");

                    $(entry).append(span).append("&nbsp;");
                }

                $(entry).append(msg);

                // add message to the history and scroll down
                var history = $(this.element).find(".ui-jtalk-chat-history");
                history.append(entry).scrollTop(history.height());
            }

            /* Display the contact's chat state in the chat window */
            this._displayChatState = function(chatstate) {
                $(this.element).find(".ui-jtalk-chat-state").text(chatstate);
            }

            // register callbacks to handle text input
            $(this.element).find("textarea")
                .keydown(keydownHandler(this)).keyup(keyupHandler(this));
        }

        contact = Strophe.getBareJidFromJid(contact);

        if (create === undefined) {
            create = true;
        }

        var c = _active_chats[contact];
        if (!c && Boolean(create) != false) {
            c = new _chat(contact);
            _active_chats[contact] = c;
        }

        return c;
    }

    /* A simple decorator that parses the common attributes out
     * of XMPP stanzas.
     * The decorated function receives the attributes in object notation.
     */
    function withCommonAttributes(f) {
        function _f(stanza) {
            var common_attrs = ["to", "from", "id", "type", "xml:lang"];

            var attrs = {}
            for (i = 0; i < common_attrs.length; i++) {
                var a = common_attrs[i];
                attrs[a] = $(stanza).attr(a);
            }

            return f(stanza, attrs);
        }

        return _f;
    }

    /* Build a unique id for iq stanzas, based on a key. */
    var time = new Date();
    function iqId(key) {
        return key + ":" + time.getTime();
    }

    /* Callback for message stanzas.
     * May trigger "chat requested"
     */
    this.onMessage = withCommonAttributes(
        function(message, attrs) {
            var body = $(message).find("body:first");

            if (body.length != 0) {
                var c = chat(attrs.from);
                var node = Strophe.getNodeFromJid(attrs.from);

                trigger("chat requested", c);
                c._addMessageToHistory(node, body.text());
            }

            var s = "*[xmlns='" + Strophe.NS.CHATSTATE + "']";
            var chatstate = $(message).find(s);
            if (chatstate.length != 0 && chat(attrs.from, false)) {
                chat(attrs.from)._displayChatState(chatstate.prop("tagName"));
            }

            return true;
        });

    /* Callback for subscription events */
    this.onSubscription = withCommonAttributes(
        function(presence, attrs) {
            // XXX blindly accept subscription
            connection.send($pres({to: attrs.from, type: "subscribed"}));
            return true;
        });

    /* Callback for roster events.
     * Triggers the "chat requested" hook.
     */
    var roster = {};
    this.onRosterReceived = withCommonAttributes(
        function onRosterReceived(iq, attrs) {
            var s = "query[xmlns='" + Strophe.NS.ROSTER + "'] > item";
            $(iq).find(s).each(
                function() {
                    var jid = $(this).attr("jid");
                    var subs = $(this).attr("subscription");

                    $(roster[jid]).remove();

                    if (subs !== "remove") {
                        roster[jid] = $("<li>").append(jid);
                        $("#ui-jchat-roster").append(roster[jid]);

                        $(roster[jid]).click(function() {
                            trigger("chat requested", chat($(this).text()));
                        });
                    }
                });

            if (attrs.type == "get" || attrs.type == "set") {
                // send response iq to the server
                var iq = $iq({to: server,
                    from: attrs.to,
                    type: "result",
                    id: attrs.id});

                connection.send(iq);
            }

            return true;
        });

    /* Callback for connection */
    this.onConnect = function(status) {
        if (status == Strophe.Status.CONNECTED) {
            // request roster
            var iq = $iq({from: user,
                type: "get",
                id: iqId("roster")});
            iq.c("query", {xmlns: "jabber:iq:roster"});
            connection.send(iq);

            // send presence
            connection.send($pres());

            return true;
        }
    }

    /* Connect to the server */
    this.connect = function() {
        connection.connect(user, password, this.onConnect);
        this._registerCallbacks();
    }

    /* Add a handler to a hook */
    this.addHandler = function(hook, handler) {
        hooks[hook] = handler;
    }

    /* Trigger a hook.
     * Returns whether or not the handler exists.
     */
    var hooks = {};
    function trigger(name, arg) {
        if (hooks[name]) {
            hooks[name](arg);
            return true;
        }

        return false;
    }

    /* Register Strophe callbacks */
    this._registerCallbacks = function() {
        connection.addHandler(this.onMessage,
                              null,
                              "message",
                              null,
                              null,
                              null,
                              null);

        connection.addHandler(this.onSubscription,
                              null,
                              "presence",
                              "subscribe",
                              null,
                              null,
                              null);

        connection.addHandler(this.onRosterReceived,
                              Strophe.NS.ROSTER,
                              "iq",
                              null,
                              null,
                              null,
                              null);
    }
}
