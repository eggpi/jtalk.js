JTalk is a XMPP chat client written in Javascript on top of the JQuery and
Strophe libraries.

It provides basic chat functionality (roster retrieval, subscription handling)
and a very basic, customizable user interface. Hopefully, this should serve as a
framework for building web-based XMPP chat clients.

Jtalk is still very much a work in progress, and its interface and usage may
change at any moment.

Usage
-----

After including jquery, strophe.js (provided in the repository for convenience)
and jtalk.js in your html file, all you (should) need to do is something like:

    var jtalk = new JTalk(server, user, password); // create a new JTalk
    // optionally register handlers with JTalk.addHandler(hook, handler)
    jtalk.connect();

JTalk will then look for a ul or ol element with id "ui-jtalk-roster" in your
document, under which the user's roster will be displayed.

You will still need to fill in presentation details, including the appearance of
the chat windows JTalk will create (for which only the basic, undocumented,
elements are created).

Hooks
-----

Some aspects of JTalk's behavior are governed by hooks, to which handlers can be
attached. Here is a list of currently supported hooks:

"new chat": Triggered when a chat window is first opened.
The handler receives a chat object and is expected to return a Boolean.
If the return value is false, the new window is simply appended to
document.body. Otherwise, no action is taken.

"new message": Triggered when a new message is added to the history of a chat
window, regardless of the sender. The handler receives an object whose 'chat'
attribute is a chat object, and whose 'text' attribute is the message's text.
The return value, if a non-empty string, is used in the history instead of the
original message. If the return value's boolean value is false, no message is
added to the history. All other return values are ignored.

"new chat state": Triggered when a new chat state (e.g. composing) is received.
The handler receives an object whose 'chat' attribute is a chat object, and
whose 'chatstate' attribute is the chat state received. The return value is
ignored.

"subscription request": Triggered when a subscription request is received. The
handler receives the jid of the user that originated the subscription. The
return value is currently ignored.

"chat requested": Triggered when the user requests a chat with a contact (i.e.,
by clicking on the contact's entry in the roster), regardless of whether a new
chat is initiated or not. The handler receives a chat object and its return
value is ignored.

This is far from a definitive list, and hooks will be added and
removed as they are deemed necessary/useless.
