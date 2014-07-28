/*
 * ##### BEGIN GPL LICENSE BLOCK #####
 *
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License
 *  as published by the Free Software Foundation; either version 2
 *  of the License, or (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software Foundation,
 *  Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 *
 * ##### END GPL LICENSE BLOCK #####
 */

function PingMeChat(pmConfig) {
	this.REGISTER_TIMEOUT		= 1000;

	this._cfg = pmConfig;

	if (this.validateConfig() == false)
		return;

	this._ws = null;
}

PingMeChat.prototype.validateConfig = function() {

	if ((this._cfg.usernameEID == undefined) || this._cfg.usernameEID == null) {
		alert("usernameEID missing from config");
		return (false);
	}

	if ((this._cfg.chatAreaEID == undefined) || this._cfg.chatAreaEID == null) {
		alert("chatAreaEID missing from config");
		return (false);
	}

	if ((this._cfg.messageEID == undefined) || this._cfg.messageEID == null) {
		alert("messageEID missing from config");
		return (false);
	}

	if ((this._cfg.host == undefined) || this._cfg.host == null) {
		alert("host missing from config");
		return (false);
	}

	if ((this._cfg.port == undefined) || this._cfg.port == null) {
		alert("port missing from config");
		return (false);
	}
}

PingMeChat.prototype.browserSupportsWebSockets = function() {

	if ("WebSocket" in window)
		return (true);

	return (false);
}

PingMeChat.prototype.connect = function() {

	this.openWebSocket();
	var self = this
	setTimeout(function() { self.register() }, this.REGISTER_TIMEOUT);
}

PingMeChat.prototype.disconnect = function() {
	this._ws.close();
}

PingMeChat.prototype.register = function() {

	this.sendControlEvent("new_user", $("#" + this._cfg.usernameEID).val());
}

PingMeChat.prototype.sendControlEvent = function(ctrlType, value) {

	var dao = {
		type: "control",
		ctrlType: ctrlType,
		value: value
	};

	if (dao.ctrlType && dao.value)
		this._ws.send(JSON.stringify(dao));
}

PingMeChat.prototype.sendMessageEvent = function() {

	var dao = {
		type: "message",
		author: $("#" + this._cfg.usernameEID).val(),
		message: $("#" + this._cfg.messageEID).val()
	};

	if (dao.author && dao.message)
		this._ws.send(JSON.stringify(dao));
}

PingMeChat.prototype.openWebSocket = function() {

	var url = "ws://" + this._cfg.host + ":" + this._cfg.port + "/chat";

	this._ws = new WebSocket(url);

	var self = this;
	this._ws.onmessage = function(ev) { self.webSocketOnMessageHandler(ev); };
	this._ws.onclose = function(ev) { self.webSocketOnCloseHandler(ev); };
}

PingMeChat.prototype.webSocketOnMessageHandler = function(ev) {

	var data = JSON.parse(ev.data);
	if (data.type == "announce")
		this.handleAnnounceEvent(data);
	else if (data.type == "announceLeft")
		this.handleAnnounceLeftEvent(data);
	else if (data.type == "message")
		this.handleMessageEvent(data);
}

PingMeChat.prototype.webSocketOnCloseHandler = function(ev) {
}

PingMeChat.prototype.handleAnnounceEvent = function(data) {

	$("#" + this._cfg.chatAreaEID).append(
	  this.createChatEntry("[SYSTEM]", data.value + " has joined."));
}

PingMeChat.prototype.handleAnnounceLeftEvent = function(data) {

	$("#" + this._cfg.chatAreaEID).append(
	  this.createChatEntry("[SYSTEM]", data.value + " has left."));
}

PingMeChat.prototype.handleMessageEvent = function(data) {

	chatArea = $("#" + this._cfg.chatAreaEID);
	chatArea.append(this.createChatEntry(data.author, data.message));
	chatArea.scrollTop(chatArea.prop("scrollHeight"));
}

PingMeChat.prototype.createChatEntry = function(username, message) {
	
	var entry = document.createElement("div");
	entry.className = "pmchat-entry";
        
	var dom_uname = document.createElement("span");
	dom_uname.className = "pmchat-username";
	dom_uname.innerHTML = username + ": ";
	entry.appendChild(dom_uname);
        
	var dom_msg = document.createElement("span");
	dom_msg.className = "pmchat-message";
	dom_msg.innerHTML = message;
	entry.appendChild(dom_msg);
        
	return (entry);
}

function initPingMeChat(pmConfig) {

	return (new PingMeChat(pmConfig));
}
