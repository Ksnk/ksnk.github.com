(function () {

    /**
     * нормировать значение угла -> 0..2*PI
     * @param b
     * @returns {*}
     */
    function norm(b) {
        while (b > 2 * Math.PI) b -= 2 * Math.PI;
        while (b < 0) b += 2 * Math.PI;
        return b;
    }

    /**
     * радианы в градусы, градусы в радианы
     * @param a
     * @returns {number}
     */
    function tograd(a) {
        return 180 * norm(a) / Math.PI;
    }

    function torad(a) {
        return norm(a * Math.PI / 180);
    }

    /**
     * расстояние между точками
     * @param fa
     * @param fb
     * @returns {number}
     */
    function dist(fa, fb) {
        let dx = fa[0] - fb[0], dy = fa[1] - fb[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Угол наклона отрезка, к оси X
     * @param A
     * @param B
     * @returns {*}
     */
    function angle(A, B) {
        let
            dx = A[0] - B[0],
            dy = A[1] - B[1], b;
        if (Math.abs(dx) < 0.000001) {
            if (dy < 0) {
                b = Math.PI / 2;
            } else {
                b = 3 * Math.PI / 2
            }
        } else {
            b = Math.atan(dy / dx); // угол наклона основы
            if (dx > 0) {
                b += Math.PI;
            }
        }
        return norm(b);
    }

    /**
     * расстояние от точки C до отрезка A-B
     * @param {number[]} A
     * @param {number[]} B
     * @param {number[]} C
     */
    function distP(A, B, C) {
        let D = prp(A, B, C);
        if (((D[0] <= A[0] && D[0] >= B[0]) || (D[0] >= A[0] && D[0] <= B[0]))
            && ((D[1] <= A[1] && D[1] >= B[1]) || (D[1] >= A[1] && D[1] <= B[1]))) {
            return dist(C, D);
        }
        return Math.min(dist(A, C), dist(B, C));
    }

    /**
     * перпендикуляр от точки C до прямой A-B
     * @param {number[]} A
     * @param {number[]} B
     * @param {number[]} C
     */
    function prp(A, B, C) {
        let dx = B[0] - A[0], dy = B[1] - A[1];
        if (Math.abs(dx) < 0.000001) {
            return [A[0], C[1]];
        } else if (Math.abs(dy) < 0.000001) {
            return [C[0], A[1]];
        }
        let dxy = dx / dy;
        if (Math.abs(dxy - 1 / dxy) < 0.000001) return C;
        let x = (C[0] * dxy - A[1] + A[0] / dxy + C[1]) / (dxy + 1 / dxy);
        return [
            x, (x - A[0]) / dxy + A[1]
        ]
    }

    /**
     * достраиваем треугольник на отрезка A-B. со стороны order
     * @param {number[]} A
     * @param {number[]} B
     * @param {number} la
     * @param {number} lb
     * @param {number} order
     * @returns {*[]} -x,y,a -  x,y координаты достраиваемой вершины, а - угол треугольника при вершине A
     */
    function buildTriangle(A, B, la, lb, order) {
        let
            dx = A[0] - B[0],
            dy = A[1] - B[1],
            d = Math.sqrt(dx * dx + dy * dy);
        if (la > lb + d || lb > la + d || d > lb + la) return [NaN, NaN, NaN];
        let
            p = (la + lb + d) / 2, // полупериметр
            a = 2 * Math.atan(Math.sqrt((p - lb) * (p - d) / (p * (p - lb)))), // прилежащий lb угол
            b = angle(A, B),
            aa = norm(b + (order > 0 ? a : -a));
        return [
            A[0] + la * Math.cos(aa),
            A[1] + la * Math.sin(aa),
            aa
        ];
    }

    /**
     * расстояние до 2 отрезков a1-b1 a2-b2
     * @param {number[]} a1
     * @param {number[]} b1
     * @param {number[]} a2
     * @param {number[]} b2
     */
    function intersectPP(a1, b1, a2, b2) {
        let discr = (a1[0] - b1[0]) * (a2[1] - b2[1]) - (a1[1] - b1[1]) * (a2[0] - b2[0]);
        if (Math.abs(discr) < 0.000001) {
            return Math.min(distP(a1, b1, a2), distP(a1, b1, b2));
        }
        let i = [
            ((a1[0] * b1[1] - a1[1] * b1[0]) * (a2[0] - b2[0]) - (a1[0] - b1[0]) * (a2[0] * b2[1] - a2[1] * b2[0])) / discr,
            ((a1[0] * b1[1] - a1[1] * b1[0]) * (a2[1] - b2[1]) - (a1[1] - b1[1]) * (a2[0] * b2[1] - a2[1] * b2[0])) / discr
        ];
        return Math.min(
            Math.max(distP(a1, b1, i), distP(a2, b2, i)),
            distP(a2, b2, a1), distP(a2, b2, b1),
            distP(a1, b1, a2), distP(a1, b1, b2)
        );
    }

    window.rhand = {

        // состояние шаговых двигателей
        pointA: [-150, 0, 40 * Math.PI / 180], // x,y, angle
        pointB: [150, 0, 90 * Math.PI / 180], // x,y, angle
        // состояние тяг
        finA: [], finB: [],
        // состояние активного манипулятора
        finC: [],

        // длины тяг 0-АА 1-АБ 2-ПА 3-ПБ
        len: [170, 170, 170, 170],
        // увеличение
        zoom: 2,
        // габариты окна
        screen: [660, 660],
        // точка центра 0x0
        zoompoint: [180 + 150, 440], // screen/2, screen * 60%

        minstep: 5,

        realmap_border: [(150 - 170 - 170) / 6, (-150 + 170 + 170) / 6, -260 / 6, 320 / 6],

        //
        map: false,
        mapcolor: 1,
        mapauto: 0,

        trace: [],
        painting: '',
        Obstacles: [],

        startA: [0, 0],
        finXY: [0, 0],
        fin_A: [0, 0],
        zerocoord: 30,

        templine: false,

        svgcache: [],

        init: function () {
            this.realmap_border = [
                Math.floor(-1 + (this.pointA[1] - this.len[1] - this.len[3]) / this.minstep),
                Math.ceil(1 + (this.pointA[0] + this.len[0] + this.len[2]) / this.minstep),
                Math.floor(-260 / this.minstep),
                Math.ceil(320 / this.minstep),
            ];
            this.zerocoord = Math.round(this.pointB[0] / this.minstep);
        },

        /**
         * интерфейсная функция - tograd, torad
         * @param a
         * @returns {*}
         */
        tograd: function (a) {
            return tograd(norm(a));
        },
        torad: function (a) {
            return norm(torad(a));
        },

        /**
         * механика сохранения
         */
        store_names: ['fin_A', 'finXY', 'startA', 'pointA', 'pointB', 'mapcolor', 'mapauto', 'trace', 'Obstacles'],

        serialize: function () {
            let ret = {};
            for (let a in this.store_names) ret[this.store_names[a]] = this[this.store_names[a]];
            return JSON.stringify(ret);
        },
        unserialize: function (obj) {
            obj = JSON.parse(obj);
            for (let a in obj) if (obj.hasOwnProperty(a) && this.hasOwnProperty(a)) this[a] = obj[a];
        },

        /**
         * конвертировать координаты экрана в координаты модели
         * @param {number[]} x
         * @returns {number[]}
         */
        fromscreen: function (x) {
            return [this.zoom * (x[0] - this.zoompoint[0]), this.zoom * (this.screen[1] - x[1] - this.zoompoint[1])];
        },

        /**
         * конвертировать координаты модели в координаты экрана
         * @param {number[]} x
         * @returns {number[]}
         */
        toscreen: function (x) {
            return [(x[0] / this.zoom + this.zoompoint[0]), (this.screen[1] - (x[1] / this.zoom + this.zoompoint[1]))];
        },

        /**
         * вычисление положения манипулятора по состоянию активных тяг
         * @param {*[]} pa - стартовые координаты и угол первого двигателя
         * @param {*[]} pb - стартовые координаты и угол второго двигателя
         * @returns {[*[], *[], *[], number]} 0- fa,1- fb - точки пассивных осей; 3-координата АЭ, 4 - порядок манипулятора
         */
        calc_silent: function (pa, pb) {
            let
                fa = [pa[0] + this.len[0] * Math.cos(pa[2]),
                    pa[1] + this.len[0] * Math.sin(pa[2])],
                fb = [pb[0] + this.len[1] * Math.cos(pb[2]),
                    pb[1] + this.len[1] * Math.sin(pb[2])],
                x = buildTriangle(fa, fb, this.len[2], this.len[3], 1),
                o1 = 0, o2 = 0;
            // расчет положения активной точки
            let xx = buildTriangle(x, pa, this.len[2], this.len[0], o1),
                yy = buildTriangle(x, pb, this.len[3], this.len[1], o2);
            if (dist(xx, fa) < 2) {
                o1 = 1 - o1;
            }

            if (dist(yy, fb) > 2) {
                o2 = 1 - o2;
            }
            return [fa, fb, x, 1 << (o1 * 2 + o2)];
        },

        // рисовать манипулятор
        draw: function () {

            function circle(a, options) {
                let x = this.toscreen(a);
                if (x[0] > 0 && x[0] < this.screen[0] && x[1] > 0 && x[1] < this.screen[1]) {
                    options = options || {};
                    ctx.beginPath();
                    ctx.lineWidth = options.lineWidth || 1;
                    ctx.strokeStyle = options.color || "white";
                    ctx.arc(x[0], x[1], options.radius || 5, 0, 2 * Math.PI);
                    ctx.fillStyle = options.fillStyle || "gray";
                    ctx.fill();
                    ctx.stroke();
                }
            }

            function line(a, b, options) {
                options = options || {};
                ctx.beginPath();
                ctx.lineCap = options.lineCap || "round";
                ctx.lineWidth = options.lineWidth || 5;
                let x = this.toscreen(a), y = this.toscreen(b);
                ctx.moveTo(x[0], x[1]);
                ctx.lineTo(y[0], y[1]);
                ctx.strokeStyle = options.color || "white";
                ctx.stroke();
            }

            let canvas = document.getElementById("canvas");
            //canvas.setAttribute("height", Math.round(zoom*(maxy-miny)+this.border*2));
            //canvas.setAttribute("width",Math.round(zoom*(maxx-minx)+this.border*2));
            let ctx = canvas.getContext("2d");

            let x = this.calc_silent(this.pointA, this.pointB);
            this.finA = x[0];
            this.finB = x[1];
            this.finC = x[2];
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let colors = [
                [2, "rgb(177,100,185,0.3)"],
                [1, "rgb(100,185,185,0.3)"],
                [8, "rgb(100,185,104,0.3)"],
                [4, "rgb(185,100,117,0.3)"],
            ];
            let m, c, colormap = [];

            if (this.mapcolor > 0 || this.mapauto) {
                let radius = 2*this.minstep/(5 * this.zoom), mapcolor = this.mapcolor;
                if (this.mapauto) mapcolor |= x[3];
                for (let x = this.realmap_border[0]; x < this.realmap_border[1]; x++) for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
                    if ((m = (this.map[x][y] & mapcolor)) > 0) {
                        if (!!(c = colormap[m])) {
                            let col0 = c;
                            if ((this.map[x][y] & 1024) > 0) {
                                col0 = 'rgb(188,188,188)';
                            } else if ((this.map[x][y] & 2048) > 0) {
                                col0 = 'rgb(214,187,187)';
                            }

                            circle.call(this, [x * this.minstep, y * this.minstep],
                                {radius: radius, color: col0, fillStyle: c});
                        } else {
                            for (let col in colors) if (!!(colors[col][0] & m)) {
                                let col0 = colors[col][1];
                                if ((this.map[x][y] & 1024) > 0) {
                                    col0 = 'rgb(188,188,188)';
                                } else if ((this.map[x][y] & 2048) > 0) {
                                    col0 = 'rgb(214,187,187)';
                                }
                                circle.call(this, [x * this.minstep, y * this.minstep],
                                    {radius: radius, color: col0, fillStyle: colors[col][1]});
                            }
                            let xx = this.toscreen([x * this.minstep, y * this.minstep]);
                            if (xx[0] > 0 && xx[0] < this.screen[0] && xx[1] > 0 && xx[1] < this.screen[1]) {
                                let pixel = ctx.getImageData(xx[0], xx[1], 1, 1),
                                    data = pixel.data;
                                colormap[m] = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
                            }
                        }
                        let a = this.toscreen([x * this.minstep, y * this.minstep]);
                        if (a[0] > 0 && a[0] < this.screen[0] && a[1] > 0 && a[1] < this.screen[1])
                            if (this.zoom < 0.3 && this._map && this._map[x] && this._map[x][y]) {
                                let v = 100000, txt = '';
                                for (let i = 0; i < 4; i++) {
                                    let aa = this._map[x][y][1 << i];
                                    if (aa != 0) {
                                        if (Math.abs(v) > Math.abs(aa)) {
                                            v = aa;
                                            ctx.fillStyle = [
                                                "rgb(44,255,249)",
                                                'rgb(250,66,232)',
                                                'rgb(255,65,119)',
                                                'rgb(125,255,45)'
                                            ][i];
                                        }
                                    }
                                }
                                if (v < 100000) {
                                    ctx.font = "9px Arial";
                                    // ctx.fillStyle = "gray";
                                    ctx.textAlign = "center";
                                    ctx.fillText('' + (Math.round(10 * v) / 10), a[0], a[1] + 4);
                                }
                            }
                    }
                }
            }
            if(!!this.Obstacles)
            for (let i = 0; i < this.Obstacles.length; i++) {
                line.call(this, this.Obstacles[i][0], this.Obstacles[i][1], {color: "white", lineWidth: "5"});
            }
            if (!!this.templine) {
                ctx.beginPath();
                ctx.lineCap = "round";
                ctx.lineWidth = 3;
                ctx.moveTo(this.templine[0][0], this.templine[0][1]);
                ctx.lineTo(this.templine[1][0], this.templine[1][1]);
                ctx.strokeStyle = "lightgray";
                ctx.stroke();
            }
            if (!!this.trace && this.trace.length>0 && this.trace[0].length>2) {
                if (!this.svgcache['trace']) {
                    let m = '', p = this.toscreen(this.trace[0][2]);
                    m += 'M' + Math.round(p[0]) + ' ' + Math.round(p[1]) + ' ';
                    for (let i = 1; i < this.trace.length; i++) {
                        if (this.trace[i][2]) {
                            p = this.toscreen(this.trace[i][2]);
                            m += 'L' + Math.round(p[0]) + ' ' + Math.round(p[1]) + ' ';
                        }
                    }
                    this.svgcache['trace'] = m;
                }
                ctx.lineWidth = 1;
                ctx.strokeStyle = "red";
                ctx.fillStyle = "red";
                let p = new Path2D(this.svgcache['trace']);
                ctx.stroke(p);
            }

            line.call(this, this.pointA, this.finA, {color: "red"});
            line.call(this, this.finA, this.finC, {color: "green"});
            line.call(this, this.pointB, this.finB, {color: "red"});
            line.call(this, this.finB, this.finC, {color: "green"});
            circle.call(this, this.pointA, {color: "red", fillStyle: "yellow"});
            circle.call(this, this.pointB, {color: "red", fillStyle: "yellow"});
            circle.call(this, this.finA, {color: "red", fillStyle: "green"});
            circle.call(this, this.finB, {color: "red", fillStyle: "green"});
            circle.call(this, this.finC, {color: "green", fillStyle: "yellow"});

        },

        /**
         * разметить карту - нарисовать области разного порядка
         */
        mapit: function () {
            let pa = [...this.pointA], pb = [...this.pointB];
            this.map = [];
            for (let x = this.realmap_border[0]; x < this.realmap_border[1]; x++) {
                this.map[x] = [];
                for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
                    this.map[x][y] = 0;
                    let letitempty = false, z = [this.minstep * x, this.minstep * y], o1 = 1, o2 = 0;
                    for (let a in this.Obstacles) {
                        let o = this.Obstacles[a];
                        // рядом с препятствием ?
                        if (distP(o[0], o[1], z) < 7) {
                            letitempty = true;
                            break;
                        }
                    }
                    if (!letitempty)
                        for (var i = 0; i < 4; i++) {
                            if (i === 2) o1 = 1 - o1;
                            if (i & 1) o2 = 1 - o2;
                            let fa = buildTriangle(pa, z, this.len[0], this.len[2], o1),
                                fb = buildTriangle(pb, z, this.len[1], this.len[3], 1 - o2);
                            if (isNaN(fb[0]) || isNaN(fa[0])) continue;
                            // угол <180 ?

                            let a = angle(fa, z), b = angle(fb, z);
                            if (Math.PI < norm(Math.PI - a + b)) {
                                if (intersectPP(pa, fa, pb, fb) > 2*this.minstep) {
                                    this.map[x][y] |= 1 << (o1 * 2 + o2);
                                }
                            }
                        }
                }
            }
            // отметить все крайние точки слева 2048 - нога A - _* и справа 1024 - B
            for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
                for (let x = this.realmap_border[0]; x < this.realmap_border[1]; x++) {
                    if (this.map[x][y] != 0 && this.map[x][y] != 8) {
                        let _y = this.minstep * y, _x = this.minstep * x - (x > 0 ? this.pointA[0] : -this.pointA[0]);
                        if (Math.abs(Math.sqrt((_x * _x + _y * _y)) - this.len[0] - this.len[1]) < this.minstep) {
                            this.map[x][y] |= (x < 0 ? 2048 : 1024);
                        }
                    }
                }
            }
            // отметить ocu
            this.map[-this.zerocoord][0] |= 1024 + 15;
            this.map[this.zerocoord][0] |= 2048 + 15;
// отметить все крайние точки ; 4096 - специальный вес, чтобы не проходить вблизи каверн
            for (let y = this.realmap_border[2] + 1; y < this.realmap_border[3] - 1; y++) {
                for (let x = this.realmap_border[1] - 2; x > this.realmap_border[0] + 1; x--) {
                    if ((this.map[x][y] & 15) != 0 && (
                        0 == (this.map[x + 1][y] & 15)
                        || 0 == (this.map[x - 1][y] & 15)
                        || 0 == (this.map[x][y - 1] & 15)
                        || 0 == (this.map[x][y + 1] & 15)
                    )) {
                        this.map[x][y] |= 4096;
                    }
                }
            }
        },

        /**
         * построить маршрут от точки a(o1) до точки b(o2)
         * волновой алгоритм c разными весами шагов.
         * Всегда берем первый элемент волны. Каждый новый элемент волны вставляем в волну,
         * в соответствии с ее весом.
         * @param {number[]} a
         * @param {number} o1
         * @param {number[]} b
         * @param {number} o2
         */
        checkPoints: function (a, o1, b, o2) {
            // сюда будем бросать длины переходов
            var map = [], trace = [], minpoint = false;
            for (let x = this.realmap_border[0]; x < this.realmap_border[1]; x++) {
                map[x] = [];
                for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
                    map[x][y] = [];
                    map[x][y][1] = 0;
                    map[x][y][2] = 0;
                    map[x][y][4] = 0;
                    map[x][y][8] = 0;
                }
            }

            // посмотреть вокруг точки
            function lookaround(xx, yy, cc, callback) {
                let res = false;
                for (let y = -1; y <= 1; ++y) {
                    for (let x = -1; x <= 1; ++x)
                        if (!(x == 0 && y == 0))
                            if (xx + x > this.realmap_border[0] && xx + x < this.realmap_border[1]
                                && yy + y > this.realmap_border[2] && yy + y < this.realmap_border[3]
                                && (this.map[xx + x][yy + y] & cc) > 0) {
                                let weight = (Math.abs(x) == Math.abs(y) ? 1.4 : 1);
                                if (!(this.map[xx + x + x] && (this.map[xx + x + x][yy + y + y] & cc) > 0)) {
                                    weight += 3; // избегаем границ зон
                                }
                                if (this.map[xx + x][yy + y] & 4096) { // избегаем клеток рядом с кавернами
                                    weight += 10;
                                }

                                res |= callback.call(this, xx + x, yy + y, cc, weight);
                            }
                }
                // проверка точек перехода
                // проверка точек перехода
                if ((1024 & this.map[xx][yy]) > 0) {
                    res |= callback.call(this, xx, yy, (cc == 1 ? 4 : (cc == 2 ? 8 : (cc == 4 ? 1 : 2))), (this.map[xx][yy] & 4096 ? 10 : 0) + 10);
                }
                if ((2048 & this.map[xx][yy]) > 0) {
                    res |= callback.call(this, xx, yy, (cc == 1 ? 2 : (cc == 2 ? 1 : (cc == 4 ? 8 : 4))), (this.map[xx][yy] & 4096 ? 10 : 0) + 10);
                }
                return res;
            }

            let p = [[Math.round(a[0] / this.minstep), Math.round(a[1] / this.minstep), o1, 1],
                [Math.round(b[0] / this.minstep), Math.round(b[1] / this.minstep), o2, -1]];
            map[p[0][0]][p[0][1]][p[0][2]] = p[0][3];
            map[p[1][0]][p[1][1]][p[1][2]] = p[1][3];
            // p.pop();
            while (minpoint === false && p.length > 0) {
                minp = 100000;
                mino = -100000;
                //обходим точки
                let pp = p.shift();
                //for (let i = 0; i < p.length; ++i) {
                // 8 соседних клеток
                let oldv = map[pp[0]][pp[1]][pp[2]];
                if (lookaround.call(this, pp[0], pp[1], pp[2], function (x, y, c, disp) {
                    let v = map[x][y][c],
                        newv = oldv +
                            (oldv < 0 ? -1 : 1) * disp;

                    if (v !== 0 && (oldv < 0) === (v > 0)) {
                        // встретили точку противоположного знака. Нашли!
                        return true;
                    } else if (v === 0 || (oldv < 0 ? v < newv : v > newv)) {
                        map[x][y][c] = newv;
                        if (newv > 0) {
                            minp = Math.min(minp, newv)
                        } else {
                            mino = Math.max(mino, newv)
                        }
                        // вставляем значение в нужную позицию
                        for (var i = 0; i < p.length; i++) {
                            if (Math.abs(p[i][3]) > Math.abs(newv))
                                break;
                        }
                        if (i > 0 && i < p.length) {
                            p.splice(i, 0, [x, y, c, newv]);
                        } else if (i == 0) {
                            p.unshift([x, y, c, newv])
                        } else {
                            p.push([x, y, c, newv]);
                        }
                    }
                }))
                    minpoint = pp;
            }
            if (minpoint === false) {
                return false; // Нету пути :(
            } else {
                let maxpoint, min;
                if (map[minpoint[0]][minpoint[1]][minpoint[2]] > 0) {
                    maxpoint = minpoint;
                    //ищем максимальное отрицательное
                    min = -1000000;
                    lookaround.call(this, maxpoint[0], maxpoint[1], maxpoint[2], function (x, y, c, disp) {
                        if (0 > map[x][y][c] && min < map[x][y][c]) {
                            min = map[x][y][c];
                            minpoint = [x, y, c];
                        }
                    });
                } else {
                    //ищем минимальное положительное
                    min = 1000000;
                    lookaround.call(this, minpoint[0], minpoint[1], minpoint[2], function (x, y, c, disp) {
                        if (0 < map[x][y][c] && min > map[x][y][c]) {
                            min = map[x][y][c];
                            maxpoint = [x, y, c];
                        }
                    });
                }
                // сворачиваем трассу. От maxpoint до начала маршрута
                min = 1000000;
                trace.unshift([this.minstep * maxpoint[0], this.minstep * maxpoint[1], maxpoint[2]]);
                while (min != 1) {
                    if (!lookaround.call(this, maxpoint[0], maxpoint[1], maxpoint[2], function (x, y, c, disp) {
                        if (0 < map[x][y][c] && min > map[x][y][c]) {
                            min = map[x][y][c];
                            maxpoint = [x, y, c];
                            return true;
                        }
                    })) {
                        break;
                    }
                    trace.unshift([this.minstep * maxpoint[0], this.minstep * maxpoint[1], maxpoint[2]]);
                }
                // сворачиваем трассу. От minpoint до конца маршрута
                min = -1000000;
                trace.push([this.minstep * minpoint[0], this.minstep * minpoint[1], minpoint[2]]);
                while (min != -1) {
                    if (!lookaround.call(this, minpoint[0], minpoint[1], minpoint[2], function (x, y, c, disp) {
                        if (0 > map[x][y][c] && min < map[x][y][c]) {
                            min = map[x][y][c];
                            minpoint = [x, y, c];
                            return true;
                        }
                    })) {
                        break;
                    }
                    trace.push([this.minstep * minpoint[0], this.minstep * minpoint[1], minpoint[2]]);
                }
                // подставляем реальные координаты начала и конца маршрута вместо первых-последних узлов трассы
                if (trace.length > 0) trace.shift();
                if (trace.length > 0) trace.pop();
                a[2] = o1;
                b[2] = o2;
                trace.unshift(a);
                trace.push(b)
                this._map = map;
                return trace;
            }
        },

        /**
         * рассчитать маршрут
         */
        buildtrace: function () {
            // точка старта
            let pa = [...this.pointA], pb = [...this.pointB];
            pa[2] = this.startA[0];
            pb[2] = this.startA[1];
            let z = this.calc_silent(pa, pb);

            pa[2] = this.fin_A[0];
            pb[2] = this.fin_A[1];
            let zz = this.calc_silent(pa, pb);
            //console.log(z,zz);
            let ret = [[this.startA[0], this.startA[1]]];

            let fa, fb, olda = false, trace = this.checkPoints(z[2], z[3], zz[2], zz[3]);

            for (var i = 1; i < trace.length; i++) {
                fa = buildTriangle(pa, trace[i], this.len[0], this.len[2], (trace[i][2] > 2));
                fb = buildTriangle(pb, trace[i], this.len[1], this.len[3], (trace[i][2] == 1 || trace[i][2] == 4));
                if (isNaN(fb[0]) || isNaN(fa[0])) {
                    olda = ret[ret.length - 1];
                    continue; // движемся вблизи точки 0
                } else {
                    if (!!olda) { // если топтались по оси - вставляем среднее между реальными ходами.
                        if (Math.abs(fa[2] - olda[0]) > Math.PI) {
                            olda[0] += (fa[2] > olda[0] ? 2 : 2) * Math.PI;
                        }
                        if (Math.abs(fb[2] - olda[1]) > Math.PI) {
                            olda[1] += (fb[2] > olda[1] ? 2 : 2) * Math.PI;
                        }
                        ret.push([(fa[2] + olda[0]) / 2, (fb[2] + olda[1]) / 2]);
                        olda = false;
                    }
                }

                ret.push([fa[2], fb[2]]);
            }
            return ret;
        },

        /**
         * пытаемся продвинуть манипулятор, по возможности сохраняя порядок тяг
         * способ применяется при клике на карту, иногда грлючит
         * @param a
         */
        moveTo: function (a) {
            let z = this.calc_silent(this.pointA, this.pointB),
                log = [], order = [0, 1];
            if (z[3] == 2) {
                order = [0, 0];
            } else if (z[3] == 4) {
                order = [1, 1];
            } else if (z[3] == 8) {
                order = [1, 0];
            } // обратный порядок второй ноги, так как строим ее в обратном порядке

            // двигаемся по 5 см от точки z[2] до точки a
            let d = dist(a, z[2]), dst = 10,
                delta = [(a[0] - z[2][0]) * (dst / d), (a[1] - z[2][1]) * (dst / d)],
                aa = [...z[2]], olda = this.pointA[2], oldb = this.pointB[2];
            while (d > 0) {
                if ((d -= dst) > 0) {
                    aa[0] += delta[0];
                    aa[1] += delta[1];
                } else {
                    aa = a;
                }
                // перебираем возможные порядки решения
                let fa, fb, o1 = order[0], o2 = order[1], found = false;
                for (var i = 0; i < 4; i++) {
                    if (i > 1) o1 = 1 - o1;
                    if (i & 1) o2 = 1 - o2;
                    fa = buildTriangle(this.pointA, aa, this.len[0], this.len[2], o1);
                    fb = buildTriangle(this.pointB, aa, this.len[3], this.len[1], o2);
                    if (isNaN(fb[0]) || isNaN(fa[0])) continue;
                    let a = angle(fa, aa), b = angle(fb, aa);
                    //console.log([o1, o2]);
                    if (Math.PI < norm(Math.PI - a + b)) {
                        order[0] = o1;
                        order[1] = o2;
                        found = true;
                        break;
                    }
                }
                if (isNaN(z[2][0])) {
                    break;
                }

                //console.log(z);
                if (found)
                    log.push([fa[2], fb[2]]);
            }
            // this.pointA[2] = olda;
            // this.pointB[2] = oldb;
            //console.log(log);
            return log;
        },

    }
})()
