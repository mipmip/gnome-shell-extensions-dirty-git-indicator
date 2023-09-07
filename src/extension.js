/*********************************************************************
 * Dirty Git is Copyright (C) 2023 Pim Snel
 * Dirty Git is Copyright (C) 2022-2023 eexpress (https://github.com/eexpress)
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

const _domain = 'dirty-git';
const GETTEXT_DOMAIN = _domain;

const { GObject, St, Gio, GLib, Pango, Clutter } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = ExtensionUtils.getCurrentExtension();
const ByteArray = imports.byteArray;
const Util = imports.misc.util;

function lg(s) { log("===" + _domain + "===>" + s); }

let gitDirs = [];
let gitRepos = [];
const configname = _domain + ".json";  //没有界面时，还不能改成schmes方式。
const configfile = GLib.get_user_config_dir() + "/" + configname;
const configorig = Me.path + "/" + configname;

const TOGGLE_ON_ICON = 'face-smile-symbolic';
const TOGGLE_OFF_ICON = 'face-sad-symbolic';

const Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    _init() {
      super._init(0.0, _domain);

      //this.dirtyDirs = 0;
      this._settings = ExtensionUtils.getSettings();
      this._settings.connect("changed::open-in-terminal-command", ()=>{this.initSettings();} );
      this._settings.connect("changed::show-changed-files", ()=>{this.initSettings();} );
      this._settings.connect("changed::alert-dirty-repos", ()=>{this.initSettings();} );
      this.initSettings();
      this.stock_icon = Gio.icon_new_for_string(Me.path + "/org.gnome.gitg-symbolic.svg");
      this.icon = new St.Icon({style_class: 'system-status-icon'});
      this.icon.gicon = Gio.icon_new_for_string(Me.path + "/org.gnome.gitg-symbolic.svg");
      this.add_child(this.icon);

      this.connect("button-press-event", (actor, event) => {
        if (event.get_button() == 2) { // refresh
          this.refresh();
        }
        if (event.get_button() == 3) { // open configfile
          Gio.app_info_launch_default_for_uri(`file://${configfile}`, global.create_app_launch_context(0, -1));
        }
      });

      if (!GLib.file_test(configfile, GLib.FileTest.IS_REGULAR)) {
        const [ok, content] = GLib.file_get_contents(configorig);
        if (ok) {
          GLib.file_set_contents(configfile, content);
        }
      }

      this.refresh();
    }

    initSettings(){
      this.openInTerminalCommand = this._settings.get_string("open-in-terminal-command");
      this.showChangedFiles = this._settings.get_boolean("show-changed-files");
      this.alertDirtyRepos = this._settings.get_boolean("alert-dirty-repos");
    }

    refresh() {

      this.menu._getMenuItems().forEach((j) => { j.destroy(); });

      this.add_extra_items();

      // re-read json file, check all dirs, refresh menu.
      //this.dirtyDirs = 0;
      try {
        if (GLib.file_test(configfile, GLib.FileTest.IS_REGULAR)) {
          const [ok, content] = GLib.file_get_contents(configfile);
          if (ok) {
            const obj = JSON.parse(ByteArray.toString(content));

            if (obj.dirs) {
              gitDirs = [];
              for (let i of obj.dirs) {
                i = i.replace(/^~/, GLib.get_home_dir());
                gitDirs.push(i);
              }
            }
            if (obj.repos) {
              gitRepos = [];
              for (let i of obj.repos) {
                i = i.replace(/^~/, GLib.get_home_dir());
                gitRepos.push(i);
              }
            }
          }
        }
      } catch (e) { throw e; }

      let globdirs = [];
      for (let i of gitDirs) {
        let gd = this.lsDirGlobs(i);
        if (!gd) continue;
        globdirs = globdirs.concat(gd);
      }

      gitDirs = gitDirs.concat(globdirs);

      this.icon.gicon = Gio.icon_new_for_string(Me.path + "/org.gnome.gitg-symbolic.svg");

      for (let i of gitDirs) {
        const r = this.lsDir(i);
        if (!r) continue;
        for (let j of r) {
          this.async_cmd_git_st(i, j);
        }
      }
      for (let repo of gitRepos) {
        let repo_parent = repo.substring(0, repo.lastIndexOf('/'));
        let repo_dir  = repo.substring(repo.lastIndexOf('/') + 1);
        this.async_cmd_git_st(repo_parent, repo_dir);
      }

    }

    async_cmd_git_st(root, path) {
      if (GLib.chdir(root) != 0) return null;  // need improve
      if (GLib.chdir(path) != 0) return null;  // need improve
      try {
        let proc = Gio.Subprocess.new(
          [ 'git', 'status' ],
          Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

        proc.communicate_utf8_async(null, null, (proc, res) => {
          try {
            let [, stdout, stderr] = proc.communicate_utf8_finish(res);
            if (proc.get_successful()) {
              const l = stdout.split("\n").filter(item => item.match(/[:：](?=\ )/));
              //if(this.dirtyDirs == 0){
              //}
              if (l.length > 0) {
                //this.dirtyDirs += 1;
                if(this.alertDirtyRepos){
                  this.icon.gicon = Gio.icon_new_for_string(Me.path + "/org.gnome.gitg-symbolic-alert.svg");
                }
                this.add_menu(root, path, true);
                if(this.showChangedFiles){
                  for (let i of l) {
                    this.add_menu(root + "/" + path, i, false);
                  }
                }
              }

            } else {
              log("err: " + stderr);
            }
          } catch (e) { logError(e); }
        });
      } catch (e) { logError(e); }
    };

    add_extra_items(){

      let item;

      item = new PopupMenu.PopupImageMenuItem("refresh", "view-refresh-symbolic", {});

      item.label.clutter_text.set_line_alignment(Pango.Alignment.RIGHT);
      //const pango = text.bold().italics().fontcolor("#F29F9C").replace(/font/g, "span");
      //item.label.clutter_text.set_markup(pango);
      item.connect('activate', (actor, event) => {
        this.refresh()
      });
      this.menu.addMenuItem(item);


      const itemS = new PopupMenu.PopupSeparatorMenuItem('dirty repo\'s');
      // Setting the label
      // menuItem.label.text = 'New Label';
      this.menu.addMenuItem(itemS);

    }

    add_menu(path, text, isDir) {
      let item;
      if (isDir) {


        const PopupMenu = imports.ui.popupMenu;


        item = new PopupMenu.PopupSubMenuMenuItem(text, true, {});

        // Setting the icon
        //item.setIcon(this.stock_icon);
        item.icon.icon_name = 'folder-symbolic';
        //item.icon = this.stock_icon;

        // Setting the label
        //menuItem.label.text = 'New Label';

        // Adding items
        item.menu.addAction('Open in Terminal', () => {
          let parsed_command = this.openInTerminalCommand.replace(/%WORKING_DIRECTORY/g,`${path}/${text}`)
          GLib.spawn_command_line_async(parsed_command);
          //~ Util.spawn(['gnome-terminal', `--working-directory='${path}/${text}' -- bash -c 'git status; bash'`]); //no work correctly.
          return Clutter.EVENT_STOP;

        });
        item.menu.addAction('Open in File Manager', () => {
          Gio.app_info_launch_default_for_uri(`file://${path}/${text}`, global.create_app_launch_context(0, -1));
        });

        //item = new PopupMenu.PopupImageMenuItem(text, this.stock_icon);
        item.label.clutter_text.set_line_alignment(Pango.Alignment.RIGHT);
        const pango = text.bold().italics().fontcolor("#F29F9C").replace(/font/g, "span");
        item.label.clutter_text.set_markup(pango);

        /*
        item.connect('activate', (actor, event) => {
          if (event.get_button() == 3) {
            let parsed_command = this.openInTerminalCommand.replace(/%WORKING_DIRECTORY/g,`${path}/${text}`)
            GLib.spawn_command_line_async(parsed_command);
            //~ Util.spawn(['gnome-terminal', `--working-directory='${path}/${text}' -- bash -c 'git status; bash'`]); //no work correctly.
            return Clutter.EVENT_STOP;
          }
          Gio.app_info_launch_default_for_uri(`file://${path}/${text}`, global.create_app_launch_context(0, -1));
        });
        */
      } else {
        item = new PopupMenu.PopupMenuItem(text);
        item.connect('activate', (actor, event) => {
          let f = text;
          f = f.replace(/^.*[:：]\ */, '').trim();
          if (event.get_button() == 3) {
            Gio.app_info_launch_default_for_uri(`file://${path}/${f}`, global.create_app_launch_context(0, -1));
            return Clutter.EVENT_STOP;
          }
          if (GLib.chdir(path) != 0) return;
          Util.spawn(['git', 'difftool', f]);
        });
      }
      this.menu.addMenuItem(item);
    };

    lsDirGlobs(path){
      if(path.slice(-1)==="*"){
        const parentdir = path.substring(0, path.lastIndexOf('/'));
        if (!this.isDir(parentdir)) return null;
        let globStart = path.substring(path.lastIndexOf('/') + 1);
        globStart = globStart.substring(0, globStart.length - 1);
        const dir = Gio.File.new_for_path(parentdir);
        let dirEnum;
        let r = [];
        try {
          dirEnum = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
        } catch (e) { dirEnum = null; }
        if (dirEnum != null) {
          let info;
          while (info = dirEnum.next_file(null)) {
            const f = info.get_name();
            if (f.startsWith(globStart) && this.isDir(parentdir + "/" + f)) {
              r.push(parentdir + "/" + f);
            }
          }
        }
        return r;
      }
    }

    lsDir(path) {  // return an array of git dirs in path.
      if (!this.isDir(path)) return null;
      const dir = Gio.File.new_for_path(path);
      let fileEnum;
      let r = [];
      try {
        fileEnum = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
      } catch (e) { fileEnum = null; }
      if (fileEnum != null) {
        let info;
        while (info = fileEnum.next_file(null)) {
          const f = info.get_name();
          if (this.isDir(path + "/" + f + "/.git")) {
            r.push(f);
          }
        }
      }
      return r;
    }

    isDir(path) {
      return GLib.file_test(path, GLib.FileTest.IS_DIR);
    }
  });

class Extension {
  constructor(uuid) {
    this._uuid = uuid;

    ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
  }

  enable() {
    this._indicator = new Indicator();
    Main.panel.addToStatusArea(this._uuid, this._indicator);
  }


  disable() {
    this._indicator.destroy();
    this._indicator = null;
  }
}

function init(meta) {
  return new Extension(meta.uuid);
}
