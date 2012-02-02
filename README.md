# JTalk

JTalk is a framework for developing web-based XMPP chat clients written in
Javascript.

JTalk provides a chat client abstraction over the Strophe.js lower-level XMPP
library that encapsulates most of the functionality and behavior required
by a simple web-based chat application.

An easily customizable, basic user interface is laid on top of the core
chat abstraction, so that with little more than defining the style information,
it is possible to quickly develop a functional chat application.

Both layers expose APIs and events that enable control over important aspects
of the chat client.

## Core chat client

The core chat client provides a chat abstraction over the low-level XMPP
protocol, based on [RFC3921][].

Supported features include roster (contact list) management, presence
information, chat states (as described in [XEP0085][]) and simple message
exchanging.

### API documentation

#### Contact

A contact is simply a container object for information about another client.

A Contact object contains the following public fields:

        Contact.jid, string, the client's jid

        Contact.name, string, the client's name

        Contact.group, string, the client's group

        Contact.subscription, string, the subscription status of the client

        Contact.presence, object, the presence information for the client

where all but Contact.jid may be null.

The presence object contains the following public fields:

        show, string, the client's availability status

        status, string, the client's status message

any of which may be null.

#### Roster

The Roster is represented by a set of Contact objects, each uniquely identified
by its bare jid.

Upon connection, JTalk will retrieve the client's roster information from the
server and make it available through the JTalk.Roster functions below.

    JTalk.Roster.get()
        Returns a jid-indexed object of all Contacts in the roster.

        This is only a local cache of the roster itself, which is stored in the
        server. Do not attempt to modify it directly.

    JTalk.Roster.get(jid)
        Returns the Contact whose jid matches the first argument, or null if
        no such contact exists.

        Argument:
        jid, string, the contact's jid

    JTalk.Roster.add(jid, name, group)
        Add a contact to the roster in the server.

        Arguments:
        jid, string, the contact's jid
        name, string, the contact's name (optional)
        group, string, the contact's group (optional)

        Returns the new Contact object.

    JTalk.Roster.remove(Contact)
        Remove a contact from the roster in the server.

#### Chats

The Chat objects encapsulate all information and behavior related to
conversations between clients.

    JTalk.Chat(Contact)
        Initialize a new Chat object with a Contact.

        Returns a Chat object.

    Chat.send(message)
        Send a message through a chat.

        An "active" chat state is automatically sent by this method.

    Chat.history()
        Get the chat's history of messages as an array of objects with the
        following public attributes:

        from, Contact, the sender of the message
        message, string, the text of the message

    Chat.history(from, message)
        Add a new entry to the chat's history.

        Arguments:
        from, Contact, the sender of the message
        message, string, the text of the message

    Chat.state(state)
        Send a chat state.

        Arguments:
        state, string, the chat state
        As per XEP-0085, must be one of "active", "paused", "inactive",
        "composing" or "gone".

    Chat.state(Contact)
        Get the last chat state sent by a contact in the context of this chat.

        May be null if the contact has not sent any chat states or is not part
        of the chat.

#### Handling client status

The resources below enable control over the status of the client and its
interaction with the server and other clients.

    JTalk.connect(server, jid, password)
        The main starting point for JTalk, connects to a server.

        Arguments:
        server, string
        jid, string, the jid to use with the connection
        password, string, the password to use with the connection

    JTalk.disconnect()
        Disconnect from the server.

    JTalk.show(show)
        Broadcast availability.

        Argument:
        show, string, the availability status

        Note that, as per RFC3921, show must be one of "away", "chat", "dnd" or
        "xa".

    JTalk.status(status)
        Broadcast a status message.

        Arguments:
        status, string, the status message

    JTalk.me
        A Contact object representing the client itself.

        This is only a local cache, do not attempt to modify it.

### Events

The core chat client may be configured to call specific handler functions
upon interesting events.

An event handler may be registered using:

    JTalk.Events.addHandler(event, handler, priority)
        Adds an event handler to an event.

        When an event is triggered, the registered handlers are called in
        sequence, in descending order of priority.

        If a handler returns null, it will be unregistered and not called
        anymore.

        The return value of the handlers will be that of the first handler that
        did not return null.

        Arguments:
        event, string, the name of the event
        handler, function, the handler function
        priority, integer, the priority of the handler (optional, default: 0)

The events raised by the core chat client are described below.

    "connected"
        Triggered when the connection has been successfully estabilished,
        after the initial presence has been sent.

        You will want to add a handler for this event _before_ calling
        JTalk.connect().

        Handler signature: handler()

        The handler's return value is ignored.

    "roster received"
        Triggered after the roster is first received, after all "new contact"
        events that resulted from the first server roster push.

        You will want to add a handler for this event _before_ calling
        JTalk.connect().

        Handler signature: handler(roster)
            roster, object, as in JTalk.Roster.get()

        The return value of the handler is ignored.

    "chat requested"
        Triggered when a message not associated with any existing chat is
        received (i.e., the other client is trying to establish a chat).

        Handler signature: Boolean | null handler(from)
            from, Contact, the sender of the message

        Unless the handler returns false, a new chat is created and
        "incoming message" is raised.

    "incoming message"
        Triggered when a new message is received in an existing chat, before
        it is added to the chat's history.

        Handler signature: Boolean | null handler(chat, message)
            chat, Chat, the chat to which the message was sent
            message, object, se JTalk.Chat.history() for public attributes

        The message is automatically added to the chat's history, unless the
        handler returns false.

    "outgoing message"
        Triggered when a new message is sent, before it is added to the chat's
        history.

        Handler signature: Boolean handler(chat, message)
            chat, Chat, the chat to which the message was sent
            message, object, se JTalk.Chat.history() for public attributes

        The message is automatically added to the chat's history, unless the
        handler returns Boolean false.

    "incoming chat state"
        Triggered when a new chat state is received.

        Handler signature: handler(chat, contact, chatstate)
            chat, Chat, the chat for which the chat state was received
            contact, Contact, the contact that sent the chat state
            chatstate, string, the chat state

    "incoming subscription"
        Triggered when another client subscribes to the user's presence.

        Handler signature: Boolean handler(contact)
            contact, Contact, the client that sent the presence subscription

        If the return value is true, the subscription is accepted. Else, the
        subscription is denied.

    "subscription denied"
        Triggered when another client denies or cancels the user's presence
        subscription.

        Handler signature: handler(contact)
            contact, Contact, the client that denied the presence subscription.

        The return value of the handler is ignored.

    "new contact"
        Triggered when a new contact is added to the roster. In particular,
        when the server first pushes the roster upon connection, this event
        is triggered for every contact.

        Handler signature: handler(contact)
            contact, Contact, the contact.

        The return value of the handler is ignored.

    "contact removed"
        Triggered when a contact is removed from the roster.

        Handler signature: handler(contact)
            contact, Contact, the contact that was removed.

        The return value of the handler is ignored.

    "contact changed"
        Triggered when the information about a contact is updated.

        Handler signature: handler(contact)
            contact, Contact, the contact.

        The return value of the handler is ignored.

[RFC3921]: http://xmpp.org/rfcs/rfc3921.html
[XEP0085]: http://xmpp.org/extensions/xep-0085.html
