import { ConnectCtrl } from '../control/ConnectCtrl';
import { HighlightCtrl } from '../control/HighlightNodeCtrl';
import { InfoBoxCtrl } from '../control/InfoBoxCtrl';
import { RelFinderCtrl } from '../control/RelFinderCtrl';
import { RelFinderDialogCtrl } from '../control/RelFinderDialogCtrl';
import { SearchBarCtrl } from '../control/SearchBarCtrl';
import { ToolbarCtrl } from '../control/ToolbarCtrl';
import { EVENT_ARGS_FRAME, EVENT_ARGS_RELFINDER, FrameEventName, GraphNode, NETWORK_OPTIONS } from '../types';
import { BaseApp } from './app';

export class RelationFinder extends BaseApp {
    private _relfinder: RelFinderCtrl;
    private _dlgNoEnoughNodesSelected;
    private _dlgClearScreenAlert;
    private _dlgSelectionCtrl: RelFinderDialogCtrl;

    public constructor(htmlFrame: HTMLElement, showDialog?: boolean) {
        super(htmlFrame, {
            showLabels: true,
            showFaces: true,
            showDegrees: true,
            showEdges: true,
            showGroups: true
        }, { showDialog: showDialog });
    }

    protected onCreateFrame(args: EVENT_ARGS_FRAME) {
        var frame = args.mainFrame;
        var app = this;

        frame.addControl("info", new InfoBoxCtrl());
        var hilight = frame.addControl("hilight", new HighlightCtrl());

        var toolbar = frame.addControl("toolbar", new ToolbarCtrl());
        var connect = frame.addControl("connect", new ConnectCtrl());
        toolbar.addButton({
            icon: "fa fa-file-code-o",
            tooltip: "load GSON string",
            click: (checked: boolean) => { connect.loadGsonString(); }
        });

        toolbar.addButton({
            icon: "fa fa-folder-open-o",
            tooltip: "load GSON url",
            click: (checked: boolean) => { connect.loadGsonUrl(); }
        });

        toolbar.addButton({
            icon: "fa fa-universal-access",
            tooltip: "connect remote IGP server",
            click: (checked: boolean) => { connect.loadRemoteServer(); }
        });

        this._frame.on(FrameEventName.GRAPH_CONNECTED, (args: EVENT_ARGS_FRAME) => {
            this._frame.clearScreen();
            hilight.clear();
            this._dlgSelectionCtrl.selectNodes([]);
        });

        this._dlgSelectionCtrl = frame.addControl("relfinderdlg", new RelFinderDialogCtrl());
        this._relfinder = frame.addControl("relfinder", new RelFinderCtrl());

        if ((<any>args).showDialog === false) {
            this._dlgSelectionCtrl.hide();
            frame.addControl("search", new SearchBarCtrl());
        }

        frame.updateNetworkOptions(function (options: NETWORK_OPTIONS) {
            options.edges.physics = false;
            options.edges.length = 0.5;
            options.physics.timestep = 0.1;
        });

        frame.on(FrameEventName.RELFINDER_START, (args: EVENT_ARGS_RELFINDER) => {
            app.startQueryWithPrompt(500, args.maxDepth);
        })

        frame.on(FrameEventName.RELFINDER_STOP, (args: EVENT_ARGS_RELFINDER) => {
            app.stopQuery();
        })

        frame.on(FrameEventName.RELFINDER_STARTED, (args: EVENT_ARGS_RELFINDER) => {
            app._dlgSelectionCtrl.emit(FrameEventName.RELFINDER_STARTED, args);
        })

        frame.on(FrameEventName.RELFINDER_STOPPED, (args: EVENT_ARGS_RELFINDER) => {
            app._dlgSelectionCtrl.emit(FrameEventName.RELFINDER_STOPPED, args);
        })

        this._dlgNoEnoughNodesSelected = $('<div title="No enough nodes"><p><span class="ui-icon ui-icon-circle-check" style="float:left; margin:0 7px 50px 0;"></span>TWO nodes are required to start relation path discovery.</p></div>').appendTo($(args.htmlMainFrame)).hide();

        this._dlgClearScreenAlert = $('<div id="dialog-confirm" title="Empty the results?"><p><span class="ui-icon ui-icon-alert" style="float:left; margin:12px 12px 20px 0;"></span>These items will be deleted. Are you sure?</p> </div>').appendTo($(args.htmlMainFrame)).hide();
    }

    public startQueryWithPrompt(refreshInterval: number = 500, maxDepth: number = 6) {
        var app = this;
        var pickedNodeIds = this._dlgSelectionCtrl.getSelectedNodeIds();
        if (pickedNodeIds.length != 2) {
            this._dlgNoEnoughNodesSelected.dialog({
                modal: true,
                resizable: false,
                height: "auto",
                width: 400,
                buttons: {
                    "I see": function () {
                        $(this).dialog("close");
                    }
                }
            });

            return;
        }

        if (this._frame.getScreenData().edges.length > 0) {
            this._dlgClearScreenAlert.dialog({
                resizable: false,
                height: "auto",
                width: 400,
                modal: true,
                buttons: {
                    "Delete all items": function () {
                        $(this).dialog("close");
                        app.startQuery(refreshInterval, maxDepth);
                    },
                    "Cancel": function () {
                        $(this).dialog("close");
                    }
                }
            });

            return;
        }

        app.startQuery(refreshInterval, maxDepth);
    }

    public startQuery(refreshInterval: number = 500, maxDepth: number = 6) {
        var app = this;
        var pickedNodeIds = this._dlgSelectionCtrl.getSelectedNodeIds();
        this._frame.deleteNodes(function (node) {
            return pickedNodeIds.indexOf(node.id) < 0;
        });

        this._relfinder.startQuery(pickedNodeIds, refreshInterval, maxDepth);
    }

    public stopQuery() {
        this._relfinder.stopQuery();
    }

    public pickup(keywords: object[], callback: (nodes: GraphNode[]) => void) {
        var app = this;
        super.pickup(keywords, (nodes: GraphNode[]) => {
            this._dlgSelectionCtrl.selectNodes(nodes);

            if (callback !== undefined)
                callback(nodes);
        });
    }
}