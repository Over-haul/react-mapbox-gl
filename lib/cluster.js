"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var mapbox_gl_1 = require("mapbox-gl");
var supercluster_1 = __importDefault(require("supercluster"));
var bbox_1 = __importDefault(require("@turf/bbox"));
var helpers_1 = require("@turf/helpers");
var context_1 = require("./context");
var Cluster = (function (_super) {
    __extends(Cluster, _super);
    function Cluster() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = {
            superC: new supercluster_1.default({
                radius: _this.props.radius,
                maxZoom: _this.props.maxZoom,
                minZoom: _this.props.minZoom,
                extent: _this.props.extent,
                nodeSize: _this.props.nodeSize,
                log: _this.props.log
            }),
            clusterPoints: []
        };
        _this.featureClusterMap = new WeakMap();
        _this.childrenChange = function (newChildren) {
            var superC = _this.state.superC;
            _this.featureClusterMap = new WeakMap();
            var features = _this.childrenToFeatures(newChildren);
            superC.load(features);
        };
        _this.mapChange = function (forceSetState) {
            if (forceSetState === void 0) { forceSetState = false; }
            var map = _this.props.map;
            var _a = _this.state, superC = _a.superC, clusterPoints = _a.clusterPoints;
            var zoom = map.getZoom();
            var canvas = map.getCanvas();
            var w = canvas.width;
            var h = canvas.height;
            var upLeft = map.unproject([0, 0]).toArray();
            var upRight = map.unproject([w, 0]).toArray();
            var downRight = map.unproject([w, h]).toArray();
            var downLeft = map.unproject([0, h]).toArray();
            var newPoints = superC.getClusters(bbox_1.default(helpers_1.polygon([[upLeft, upRight, downRight, downLeft, upLeft]])), Math.round(zoom));
            if (newPoints.length !== clusterPoints.length || forceSetState) {
                _this.setState({ clusterPoints: newPoints });
            }
        };
        _this.childrenToFeatures = function (children) {
            return children.map(function (child) {
                var feature = _this.feature(child && child.props.coordinates);
                _this.featureClusterMap.set(feature, child);
                return feature;
            });
        };
        _this.getLeaves = function (feature, limit, offset) {
            var superC = _this.state.superC;
            return superC
                .getLeaves(feature.properties && feature.properties.cluster_id, limit || Infinity, offset)
                .map(function (leave) { return _this.featureClusterMap.get(leave); });
        };
        _this.zoomToClusterBounds = function (event) {
            var markers = Array.prototype.slice.call(event.currentTarget.children);
            var marker = _this.findMarkerElement(event.currentTarget, event.target);
            var index = markers.indexOf(marker);
            var cluster = _this.state.clusterPoints[index];
            if (!cluster.properties || !cluster.properties.cluster_id) {
                return;
            }
            var children = _this.state.superC.getLeaves(cluster.properties && cluster.properties.cluster_id, Infinity);
            var childrenBbox = bbox_1.default(helpers_1.featureCollection(children));
            _this.props.map.fitBounds(mapbox_gl_1.LngLatBounds.convert(childrenBbox), {
                padding: _this.props.zoomOnClickPadding
            });
        };
        return _this;
    }
    Cluster.prototype.componentDidMount = function () {
        var _a = this.props, children = _a.children, map = _a.map;
        if (children) {
            this.childrenChange(children);
        }
        map.on('move', this.mapChange);
        map.on('zoom', this.mapChange);
        this.mapChange();
    };
    Cluster.prototype.componentWillUnmount = function () {
        var map = this.props.map;
        map.off('move', this.mapChange);
        map.off('zoom', this.mapChange);
    };
    Cluster.prototype.componentDidUpdate = function (prevProps) {
        var children = prevProps.children;
        if (children !== this.props.children && this.props.children) {
            this.childrenChange(this.props.children);
            this.mapChange(true);
        }
    };
    Cluster.prototype.feature = function (coordinates) {
        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: coordinates
            },
            properties: {}
        };
    };
    Cluster.prototype.findMarkerElement = function (target, element) {
        if (element.parentElement === target) {
            return element;
        }
        return this.findMarkerElement(target, element.parentElement);
    };
    Cluster.prototype.render = function () {
        var _this = this;
        var _a = this.props, ClusterMarkerFactory = _a.ClusterMarkerFactory, style = _a.style, className = _a.className, tabIndex = _a.tabIndex;
        var clusterPoints = this.state.clusterPoints;
        return (React.createElement("div", { style: style, className: className, tabIndex: tabIndex, onClick: this.props.zoomOnClick ? this.zoomToClusterBounds : undefined }, clusterPoints.map(function (feature) {
            if (feature.properties && feature.properties.cluster) {
                return ClusterMarkerFactory(feature.geometry.coordinates, feature.properties.point_count, _this.getLeaves.bind(_this, feature));
            }
            return _this.featureClusterMap.get(feature);
        })));
    };
    Cluster.defaultProps = {
        radius: 60,
        minZoom: 0,
        maxZoom: 16,
        extent: 512,
        nodeSize: 64,
        log: false,
        zoomOnClick: false,
        zoomOnClickPadding: 20
    };
    return Cluster;
}(React.Component));
exports.Cluster = Cluster;
exports.default = context_1.withMap(Cluster);
//# sourceMappingURL=cluster.js.map