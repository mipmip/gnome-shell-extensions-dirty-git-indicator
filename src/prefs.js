/*********************************************************************
 * Dirty Git is Copyright (C) 2023 Pim Snel
 *
 * Dirty Git is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation
 *
 * Dirty Git is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Highlight Focus.  If not, see <http://www.gnu.org/licenses/>.
 **********************************************************************/

//const GObject = imports.gi.GObject;
//const Gio = imports.gi.Gio;
//const Gtk = imports.gi.Gtk;
//const Gdk = imports.gi.Gdk;
//const ExtensionUtils = imports.misc.extensionUtils;
//const Me = ExtensionUtils.getCurrentExtension();
//const UI = Me.imports.ui;

import * as UI from "./ui.js";

import Adw from "gi://Adw";
import Gio from "gi://Gio";
//import Gdk from "gi://Gdk";
import Gtk from "gi://Gtk";
//import GObject from "gi://GObject";

import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class HightlightCurrentWindowPreferences extends ExtensionPreferences {

  fillPreferencesWindow(window) {

    window._settings = this.getSettings();
    const page = new Adw.PreferencesPage({
      title: "General",
      icon_name: "dialog-information-symbolic",
    });
    window.add(page);

    const group = new Adw.PreferencesGroup({
      title: "Main Settings",
      description: "Configure general settings",
    });
    page.add(group);

    this.window = window;
    this.group = group;

    //this._settings = ExtensionUtils.getSettings();

    //this.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

    this._grid = new UI.ListGrid();

    this.set_child(new UI.Frame(this._grid));

    let mainSettingsLabel = new UI.LargeLabel("Main Settings");
    this._grid._add(mainSettingsLabel)

    this._openInCmdEntry = new Gtk.Entry();
    let label_open_in_cmd = new UI.Label('Open dir in terminal command')
    this._grid._add(label_open_in_cmd, this._openInCmdEntry);
    this.window._settings.bind("open-in-terminal-command", this._openInCmdEntry, "text", Gio.SettingsBindFlags.DEFAULT);

    let alertDirtyRepos = new UI.Check("Alert dirty repos");
    this.window._settings.bind('alert-dirty-repos', alertDirtyRepos, 'active', Gio.SettingsBindFlags.DEFAULT);
    this._grid._add(alertDirtyRepos);

    let showChangedFiles = new UI.Check("Show changed files");
    this.window._settings.bind('show-changed-files', showChangedFiles, 'active', Gio.SettingsBindFlags.DEFAULT);
    this._grid._add(showChangedFiles);

    group.add(this._grid);


  }

}

/**
 * Describes the widget that is shown in the extension settings section of
 * GNOME tweek.
 */
/*
const DirtyGitPrefsWidget = new GObject.Class({
  Name: 'Shortcuts.Prefs.Widget',
  GTypeName: 'DirtyGitPrefsWidget',
  Extends: Gtk.ScrolledWindow,

  _init: function() {
    this.parent(
      {
        valign: Gtk.Align.FILL,
        vexpand: true
      }
    );

    this._settings = ExtensionUtils.getSettings();

    this.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

    this._grid = new UI.ListGrid();

    this.set_child(new UI.Frame(this._grid));

    let mainSettingsLabel = new UI.LargeLabel("Main Settings");
    this._grid._add(mainSettingsLabel)

    this._openInCmdEntry = new Gtk.Entry();
    let label_open_in_cmd = new UI.Label('Open dir in terminal command')
    this._grid._add(label_open_in_cmd, this._openInCmdEntry);
    this._settings.bind("open-in-terminal-command", this._openInCmdEntry, "text", Gio.SettingsBindFlags.DEFAULT);

    let alertDirtyRepos = new UI.Check("Alert dirty repos");
    this._settings.bind('alert-dirty-repos', alertDirtyRepos, 'active', Gio.SettingsBindFlags.DEFAULT);
    this._grid._add(alertDirtyRepos);

    let showChangedFiles = new UI.Check("Show changed files");
    this._settings.bind('show-changed-files', showChangedFiles, 'active', Gio.SettingsBindFlags.DEFAULT);
    this._grid._add(showChangedFiles);


  }
});
*/
