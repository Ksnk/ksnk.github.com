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

    init: function () {
        this.realmap_border = [
            Math.floor(-1+(this.pointA[1] - this.len[1] - this.len[3]) / this.minstep),
            Math.ceil(1+(this.pointA[0] + this.len[0] + this.len[2]) / this.minstep),
            Math.floor(-260 / this.minstep),
            Math.ceil(320 / this.minstep),
        ];
        this.zerocoord = Math.round(this.pointB[0] / this.minstep);
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
     * радианы в градусы, градусы в радианы
     * @param a
     * @returns {number}
     */
    tograd: function (a) {
        return 180 * this.norm(a) / Math.PI;
    },
    torad: function (a) {
        return this.norm(a * Math.PI / 180);
    },

    /**
     * расстояние между точками
     * @param fa
     * @param fb
     * @returns {number}
     */
    dist: function (fa, fb) {
        let dx = fa[1] - fb[1], dy = fa[0] - fb[0];
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * нормировать значение угла -> 0..2*PI
     * @param b
     * @returns {*}
     */
    norm: function (b) {
        while (b > 2 * Math.PI) b -= 2 * Math.PI;
        while (b < 0) b += 2 * Math.PI;
        return b;
    },

    /**
     * Угол наклона отрезка, к оси X
     * @param fa
     * @param fb
     * @returns {*}
     */
    angle: function (fa, fb) {
        let
            dx = fa[0] - fb[0],
            dy = fa[1] - fb[1], b;
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
        return this.norm(b);
    },

    /**
     * достраиваем треугольник на отрезка fa-fb. со стороны order
     * @param {number[]} fa
     * @param {number[]} fb
     * @param {number} la
     * @param {number} lb
     * @param {number} order
     * @returns {*[]} -x,y,a -  x,y координаты достраиваемой вершины, а - угол треугольника при вершине fa
     */
    buildTriangle: function (fa, fb, la, lb, order) {
        let
            dx = fa[0] - fb[0],
            dy = fa[1] - fb[1],
            d = Math.sqrt(dx * dx + dy * dy);
        if (la > lb + d || lb > la + d || d > lb + la) return [NaN, NaN, NaN];
        let
            p = (la + lb + d) / 2, // полупериметр
            a = 2 * Math.atan(Math.sqrt((p - lb) * (p - d) / (p * (p - lb)))), // прилежащий lb угол
            b = this.angle(fa, fb),
            //a = Math.acos(d / (la + lb)), // только для равных сторон!!!
            aa = this.norm(b + (order > 0 ? a : -a));
        return [
            fa[0] + la * Math.cos(aa),
            fa[1] + la * Math.sin(aa),
            aa
        ];
    },

    /**
     * расстояние от точки C до отрезка A-B
     * @param {*[]} A
     * @param {*[]} B
     * @param {*[]} C
     */
    distP: function (A, B, C) {
        let dx = A[0] - B[0],
            dy = A[1] - B[1],
            d = Math.sqrt(dx * dx + dy * dy),
            D = this.prp(A, B, C);
        if (((D[0] <= A[0] && D[0] >= B[0]) || (D[0] >= A[0] && D[0] <= B[0]))
            && ((D[1] <= A[1] && D[1] >= B[1]) || (D[1] >= A[1] && D[1] <= B[1]))) {
            return this.dist(C, D);
            //Math.abs((dy*C[1]+dx*C[1]+(A[0]*B[1]+A[1]*B[0]))/d);
        }
        return Math.min(this.dist(A, C), this.dist(B, C));
    },

    /**
     * перпендикуляр от точки C до отрезка A-B
     * @param {*[]} A
     * @param {*[]} B
     * @param {*[]} C
     */
    prp: function (A, B, C) {
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
            x = this.buildTriangle(fa, fb, this.len[2], this.len[3], 1),
            o1 = 0, o2 = 0;
        // расчет положения активной точки
        let xx = this.buildTriangle(x, pa, this.len[2], this.len[0], o1),
            yy = this.buildTriangle(x, pb, this.len[3], this.len[1], o2);
        if (this.dist(xx, fa) < 2) {
            o1 = 1 - o1;
        }

        if (this.dist(yy, fb) > 2) {
            o2 = 1 - o2;
        }
        return [fa, fb, x, 1 << (o1 * 2 + o2)];
    },

    // рисовать манипулятор
    draw: function () {

        function circle(a, options) {
            options = options || {};
            ctx.beginPath();
            ctx.lineWidth = options.lineWidth || 1;
            ctx.strokeStyle = options.color || "white";
            let x = this.toscreen(a);
            ctx.arc(x[0], x[1], options.radius || 5, 0, 2 * Math.PI);
            ctx.fillStyle = options.fillStyle || "gray";
            ctx.fill();
            ctx.stroke();
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
            let mapcolor = this.mapcolor;
            if (this.mapauto) mapcolor |= x[3];
            for (let x = this.realmap_border[0]; x < this.realmap_border[1]; x++) for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
                if ((m = (this.map[x][y] & mapcolor)) > 0) {
                    if (!!(c = colormap[m])) {
                        circle.call(this, [x * this.minstep, y * this.minstep],
                            {radius: 2, color: c, fillStyle: c});
                    } else {
                        for (let col in colors) if (!!(colors[col][0] & m)) {
                            circle.call(this, [x * this.minstep, y * this.minstep],
                                {radius: 1, color: colors[col][1], fillStyle: colors[col][1]});
                        }
                        let xx = this.toscreen([x * this.minstep, y * this.minstep]);
                        let pixel = ctx.getImageData(xx[0], xx[1], 1, 1),
                            data = pixel.data;
                        colormap[m] = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
                    }
                }
            }
        }
        for (let i = 0; i < this.Obstacles.length; i++) {
            line.call(this, this.Obstacles[i][0], this.Obstacles[i][1], {color: "white", lineWidth: "5"});
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
     * разметить карту
     */
    mapit: function () {
        let pa = [...this.pointA], pb = [...this.pointB];
        this.map = [];
        for (let x = this.realmap_border[0]; x < this.realmap_border[1]; x++) {
            this.map[x] = [];
            for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
                this.map[x][y] = 0;
                let clearpoint = false, z = [this.minstep * x, this.minstep * y], o1 = 1, o2 = 0;
                for (let a in this.Obstacles) {
                    let o = this.Obstacles[a], d = this.distP(o[0], o[1], z);
                    if (d < 7) {
                        clearpoint = true;
                        break;
                    }
                }
                if (!clearpoint)
                    for (var i = 0; i < 4; i++) {
                        if (i === 2) o1 = 1 - o1;
                        if (i & 1) o2 = 1 - o2;
                        let fa = this.buildTriangle(pa, z, this.len[0], this.len[2], o1),
                            fb = this.buildTriangle(pb, z, this.len[1], this.len[3], 1 - o2);
                        if (isNaN(fb[0]) || isNaN(fa[0])) continue;
                        // угол <180 ?
                        let a = this.angle(fa, z), b = this.angle(fb, z);
                        if (Math.PI < this.norm(Math.PI - a + b)) {
                            this.map[x][y] |= 1 << (o1 * 2 + o2);
                        }
                    }
            }
        }
        // отметить все крайние точки слева; 2048 - можно рулить ногой A - _*
        for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
            for (let x = this.realmap_border[0]+1; x < this.realmap_border[1]; x++) {
                if (this.map[x][y] != 0 && this.map[x][y] != 8) {
                    this.map[x][y] |= 2048;
                }
                if (this.map[x][y] != 0) {
                    break;
                }
            }
        }
        // отметить все крайние точки справа; 1024 - можно рулить ногой B - *_
        for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
            for (let x = this.realmap_border[1] - 1; x > this.realmap_border[0]; x--) {
                if (this.map[x][y] != 0 && this.map[x][y] != 8) {
                    this.map[x][y] |= 1024;
                }
                if (this.map[x][y] != 0) {
                    break;
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
     * волновой алгоритм
     * @param {any[]} a
     * @param {number} o1
     * @param {any[]} b
     * @param {number} o2
     */
    checkPoints: function (a, o1, b, o2) {
        // сюда будем бросать длины переходов
        var map = [], trace = [], minpoint = false, minlength = 100000, finish = false;
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
                            let weight = 1;
                            if (Math.abs(x) == Math.abs(y)) weight = 1.4;
                            if (!(this.map[xx + x + x] && (this.map[xx + x + x][yy + y + y] & cc) > 0)) {
                                weight += 10; // избегаем границ зон
                            }
                            if (this.map[xx + x][yy + y] & 4096) weight += 10; // избегаем клеток рядом с кавернами

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

        let p = [[Math.round(a[0] / this.minstep), Math.round(a[1] / this.minstep), o1],
            [Math.round(b[0] / this.minstep), Math.round(b[1] / this.minstep), o2]];
        map[p[0][0]][p[0][1]][p[0][2]] = 1;
        map[p[1][0]][p[1][1]][p[1][2]] = -1;
        while (!finish && p.length > 0) {
            var points = [];
            //обходим точки
            for (let i = 0; i < p.length; ++i) {
                // 8 соседних клеток
                let oldv = map[p[i][0]][p[i][1]][p[i][2]];
                lookaround.call(this, p[i][0], p[i][1], p[i][2], function (x, y, c, disp) {
                    let v = map[x][y][c],
                        newv = oldv +
                            (oldv < 0 ? -1 : 1) * disp;
                    if (v === 0 || (oldv < 0 ? v < newv : v > newv)) {
                        map[x][y][c] = newv;
                        points.push([x, y, c]);
                    }
                    if (v !== 0 && (oldv < 0) === (v > 0)) {
                        let newmin = Math.abs(newv - v);
                        if (minlength > newmin) {
                            minpoint = [x, y, c];
                            minlength = newmin;
                        }
                        // встретили точку противоположного знака - финиш, но волну закончим.
                        finish = true;
                    }
                })
            }
            //повторяем для новых клеток
            p = points;//console.log(cnt++,points.length); // 400 max
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
                if (Math.abs(maxpoint[0]) == this.zerocoord && maxpoint[1] == 0) {
                    trace.unshift([]);
                    continue;
                }
                trace.unshift([this.minstep * maxpoint[0], this.minstep * maxpoint[1], maxpoint[2]]);
            }
            // сворачиваем трассу. От minpoint до конца маршрута
            min = -1000000;
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
                if (Math.abs(minpoint[0]) == this.zerocoord && minpoint[1] == 0) {
                    trace.push([]);
                    continue;
                }
                trace.push([this.minstep * minpoint[0], this.minstep * minpoint[1], minpoint[2]]);
            }
            // подставляем реальные координаты начала и конца маршрута вместо узлов сетки
            if (trace.length > 0) trace.shift();
            if (trace.length > 0) trace.pop();
            a[2] = o1;
            b[2] = o2;
            trace.unshift(a);
            trace.push(b);
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

        let fa, fb, olda = false, trace = this.checkPoints(z[2], z[3], zz[2], zz[3]);//, v=trace[0][3];
        for (var i = 1; i < trace.length; i++) {
            if (trace[i].length === 0) { // пропускаем несколько ходов, пока топчемся по оси.
                olda = [fa[2], fb[2]];
                while (trace[++i].length === 0) ;
            }
            fa = this.buildTriangle(pa, trace[i], this.len[0], this.len[2], (trace[i][2] > 2));
            fb = this.buildTriangle(pb, trace[i], this.len[1], this.len[3], (trace[i][2] == 1 || trace[i][2] == 4));
            if (isNaN(fb[0]) || isNaN(fa[0])) {
                console.log('Opps!'); // Что-то пошло не так, ошибка обсчета маршрута.
                return;
            }
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
            ret.push([fa[2], fb[2]]);
        }
        return ret;
    },

    /**
     * пытаемся продвинуть манипулятор, по возможности сохраняя порядок тяг
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
        let d = this.dist(a, z[2]), dst = 10,
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
                fa = this.buildTriangle(this.pointA, aa, this.len[0], this.len[2], o1);
                fb = this.buildTriangle(this.pointB, aa, this.len[3], this.len[1], o2);
                if (isNaN(fb[0]) || isNaN(fa[0])) continue;
                let a = this.angle(fa, aa), b = this.angle(fb, aa);
                console.log([o1, o2]);
                if (Math.PI < this.norm(Math.PI - a + b)) {
                    order[0] = o1;
                    order[1] = o2;
                    //this.mapit(aa,[o1,o2]);
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

};
