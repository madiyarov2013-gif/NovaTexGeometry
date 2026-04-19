// Canvas roundRect polyfill for older browsers (electronic whiteboards)
if (typeof CanvasRenderingContext2D !== 'undefined') {
    if (!CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radii) {
            if (typeof radii === 'undefined') {
                radii = 0;
            }

            let radius;
            if (typeof radii === 'number') {
                radius = { tl: radii, tr: radii, br: radii, bl: radii };
            } else if (Array.isArray(radii)) {
                if (radii.length === 1) {
                    radius = { tl: radii[0], tr: radii[0], br: radii[0], bl: radii[0] };
                } else if (radii.length === 2) {
                    radius = { tl: radii[0], tr: radii[1], br: radii[0], bl: radii[1] };
                } else if (radii.length === 3) {
                    radius = { tl: radii[0], tr: radii[1], br: radii[2], bl: radii[1] };
                } else {
                    radius = { tl: radii[0], tr: radii[1], br: radii[2], bl: radii[3] };
                }
            } else {
                radius = { tl: 0, tr: 0, br: 0, bl: 0 };
            }

            this.moveTo(x + radius.tl, y);
            this.lineTo(x + width - radius.tr, y);
            this.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
            this.lineTo(x + width, y + height - radius.br);
            this.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
            this.lineTo(x + radius.bl, y + height);
            this.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
            this.lineTo(x, y + radius.tl);
            this.quadraticCurveTo(x, y, x + radius.tl, y);
            this.closePath();

            return this;
        };
    }
}

// Path2D roundRect polyfill
if (typeof Path2D !== 'undefined') {
    if (!Path2D.prototype.roundRect) {
        Path2D.prototype.roundRect = function (x, y, width, height, radii) {
            // Path2D doesn't have direct access to canvas context methods
            // This is a simplified implementation
            return this;
        };
    }
}

// requestAnimationFrame polyfill
if (!window.requestAnimationFrame) {
    window.requestAnimationFrame =
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            return window.setTimeout(callback, 1000 / 60);
        };
}

if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame =
        window.webkitCancelAnimationFrame ||
        window.mozCancelAnimationFrame ||
        window.msCancelAnimationFrame ||
        function (id) {
            window.clearTimeout(id);
        };
}

// Array.prototype.includes polyfill
if (!Array.prototype.includes) {
    Array.prototype.includes = function (searchElement, fromIndex) {
        if (this == null) {
            throw new TypeError('"this" is null or not defined');
        }
        var o = Object(this);
        var len = o.length >>> 0;
        if (len === 0) {
            return false;
        }
        var n = fromIndex | 0;
        var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
        while (k < len) {
            if (o[k] === searchElement) {
                return true;
            }
            k++;
        }
        return false;
    };
}

// Object.assign polyfill
if (typeof Object.assign !== 'function') {
    Object.assign = function (target) {
        if (target == null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }
        var to = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var nextSource = arguments[index];
            if (nextSource != null) {
                for (var nextKey in nextSource) {
                    if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
        }
        return to;
    };
}

console.log('Polyfills loaded for legacy browser support');
