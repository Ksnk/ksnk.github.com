window.rhand = {

    // состояние шаговых двигателей
    pointA: [-150, 0, 40*Math.PI/180], // x,y, angle
    pointB: [150, 0, 90*Math.PI/180], // x,y, angle
    // состояние тяг
    finA: [], finB: [],
    // состояние активного манипулятора
    finC: [],

    // длины тяг 0-АА 1-АБ 2-ПА 3-ПБ
    len: [170, 170, 170, 170],
    // увеличение
    zoom: 1,
    // габариты окна
    screen: [660, 760],
    // точка центра внимания
    zoompoint: [180 + 150, 440],

    realmap_border: [-38, 39, -51, 63],

    //
    map: false,
    mapcolor: 1,
    mapauto: 0,

    trace:[],

    startA: [0, 0],
    finXY: [0, 0],
    fin_A: [0, 0],

    /**
     * механика сохранения
     */
    store_names: ['fin_A', 'finXY', 'startA', 'pointA', 'pointB',  'mapcolor', 'mapauto', 'trace'],

    serialize: function () {
        let ret = {};
        for (let a in this.store_names) ret[this.store_names[a]] = this[this.store_names[a]];
        return JSON.stringify(ret);
    },
    unserialize: function (obj) {
        obj = JSON.parse(obj);
        for (let a in obj) if (this.hasOwnProperty(a)) this[a] = obj[a];
    },

    /**
     * конвертировать координаты экрана в координаты модели
     * @param {number[]} x
     * @returns {number[]}
     */
    fromscreen: function (x) {
        return [x[0] - this.zoompoint[0], (this.screen[1] - x[1]) - this.zoompoint[1]];
    },

    /**
     * конвертировать координаты модели в координаты экрана
     * @param {number[]} x
     * @returns {number[]}
     */
    toscreen: function (x) {
        return [x[0] + this.zoompoint[0], this.screen[1] - (x[1] + this.zoompoint[1])];
    },


    tograd: function(a){
        return 180*this.norm(a)/Math.PI;
    },
    torad: function(a){
        return this.norm(a*Math.PI/180);
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
     * нормировать значение угла
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
        if (Math.abs(dx) < 0.00001) {
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
     * @param fa
     * @param fb
     * @param la
     * @param lb
     * @param order
     * @returns {*[]}
     */
    buildTriangle: function (fa, fb, la, lb, order) {
        let
            dx = fa[0] - fb[0],
            dy = fa[1] - fb[1],
            b = this.angle(fa, fb),
            d = Math.sqrt(dx * dx + dy * dy),
            a = Math.acos(d / (la + lb)),
            aa = b + (order > 0 ? a : -a);
        return [
            fa[0] + la * Math.cos(aa),
            fa[1] + la * Math.sin(aa),
            aa
        ];
    },

    /**
     * вычисление положения манипулятора по состоянию активных тяг
     * @param {*[]} pa - стартовые координаты и угол первого двигателя
     * @param {*[]} pb - стартовые координаты и угол второго двигателя
     * @returns {[*[], *[], *[]]}
     */
    calc_silent: function (pa, pb) {
        let
            fa = [pa[0] + this.len[0] * Math.cos(pa[2]),
                pa[1] + this.len[0] * Math.sin(pa[2])],
            fb = [pb[0] + this.len[1] * Math.cos(pb[2]),
                pb[1] + this.len[1] * Math.sin(pb[2])],
            x = this.buildTriangle(fa, fb, this.len[2], this.len[3], 1), o1 = 0, o2 = 0;
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
            let mapcolor=this.mapcolor ;
            if(this.mapauto)mapcolor |=x[3];
            for (let x = this.realmap_border[0]; x < this.realmap_border[1]; x++) for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
                if ((m = (this.map[x][y] & mapcolor)) > 0) {
                    if (!!(c = colormap[m])) {
                        circle.call(this, [x * 5, y * 5],
                            {radius: 2, color: c, fillStyle: c});
                    } else {
                        for (let col in colors) if (!!(colors[col][0] & m)) {
                            circle.call(this, [x * 5, y * 5],
                                {radius: 2, color: colors[col][1], fillStyle: colors[col][1]});
                        }
                        let xx = this.toscreen([x * 5, y * 5]);
                        let pixel = ctx.getImageData(xx[0], xx[1], 1, 1),
                            data = pixel.data;
                        colormap[m] = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
                    }
                }
            }
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

                let z = [5 * x, 5 * y], o1 = 1, o2 = 0;
                for (var i = 0; i < 4; i++) {
                    if (i == 2) o1 = 1 - o1;
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
    },

    /**
     * построить маршрут от точки a до точки b с порядком с
     * @param {any[]} a
     * @param {any[]} b
     * @param {number} c
     */
    checkPoints: function (a, b, c) {
        // сюда будем бросать длины переходов
        var map = [];
        for (let x = this.realmap_border[0]; x < this.realmap_border[1]; x++) {
            map[x] = [];
            for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
                map[x][y] = -1;
            }
        }
        let p = [[Math.round(a[0] / 5), Math.round(a[1] / 5)]],
            fin = [Math.round(b[0] / 5), Math.round(b[1] / 5)]
        map[p[0][0]][p[0][1]] = 0;
        while (p.length > 0) {
            var points = [];
            //обходим точки
            for (let i = 0; i < p.length; ++i) {
                if (p[i][0] == fin[0] && p[i][1] == fin[1]) {
                    points = [];
                    break;
                }
                //var x = 0;
                //var y = 0;
                //проверяем окружные 8 клеток
                for (let y = -1; y <= 1; ++y)
                    for (let x = -1; x <= 1; ++x)
                        if (!(x == 0 && y == 0))
                            if (p[i][0] + x > this.realmap_border[0] && p[i][0] + x < this.realmap_border[1]
                                && p[i][1] + y > this.realmap_border[2] && p[i][1] + y < this.realmap_border[3]
                                && (this.map[p[i][0] + x][p[i][1] + y] & c) > 0) {
                                let v = map[p[i][0] + x][p[i][1] + y],
                                    newv = map[p[i][0]][p[i][1]] +
                                        ((Math.abs(x) == Math.abs(y)) ? 1.4 : 1);
                                if (v < 0) {
                                    points.push([p[i][0] + x, p[i][1] + y]);
                                }
                                if (v < 0 || v > newv) {
                                    map[p[i][0] + x][p[i][1] + y] = newv;
                                }
                            }
            }
            //повторяем для новых клеток
            p = points;
        }
        if (map[fin[0]][fin[1]] < 0) {
            return false;
        } else {
            // разворачиваем путь в обратную сторону
            let min, v = map[fin[0]][fin[1]], p = [fin[0], fin[1]], trace = [];
            while (v > 0) {
                trace.unshift([p[0] * 5, p[1] * 5]);
                min = false;
                for (let y = -1; y <= 1; ++y) for (let x = -1; x <= 1; ++x) if (!(x == 0 && y == 0)) {
                    if (v > map[p[0] + x][p[1] + y] && map[p[0] + x][p[1] + y] >= 0) {
                        v = map[p[0] + x][p[1] + y];
                        min = [p[0] + x, p[1] + y];
                    }
                }
                if (!min) {
                    return false;
                }
                p = min;
            }
            if(trace.length>0)trace.shift();
            if(trace.length>0)trace.pop();
            trace.unshift(a);trace[0].push(map[fin[0]][fin[1]]);
            trace.push(b);
            return trace;
        }
    },

    /**
     * рассчитать маршрут
     * @param angle
     */
    buildtrace: function () {
        // точка старта
        let pa = [...this.pointA], pb = [...this.pointB];
        pa[2] = this.startA[0];
        pb[2] = this.startA[1];
        let z = this.calc_silent(pa, pb), o1 = z[3];

        pa[2] = this.fin_A[0];
        pb[2] = this.fin_A[1];
        let zz = this.calc_silent(pa, pb), o2 = zz[3];
        //console.log(z,zz);
        let ret = [[this.startA[0], this.startA[1]]], mpoint;

        let maneur_points = [
            [157, 0, 8 + 2],
            [147, 0, 1 + 4],
            [-157, 0, 8 + 4],
            [-147, 0, 1 + 2]
        ];

        function filltrace(a, b, o) {
            let trace = this.checkPoints(a, b, o);//, v=trace[0][3];
            for (var i = 1; i < trace.length; i++) {
                let fa = this.buildTriangle(pa, trace[i], this.len[0], this.len[2], (o > 2),
                    fb = this.buildTriangle(pb, trace[i], this.len[1], this.len[3], (o == 1 || o == 4)));
                if (isNaN(fb[0]) || isNaN(fa[0])) {
                    console.log('Opps!');
                    return;
                }
                ret.push([fa[2], fb[2]]);
            }
        }
        function calc(a) {
            let
                fa = [pa[0] + this.len[0] * Math.cos(a[0]),
                    pa[1] + this.len[0] * Math.sin(a[0])],
                fb = [pb[0] + this.len[1] * Math.cos(a[1]),
                    pb[1] + this.len[1] * Math.sin(a[1])];
            return this.buildTriangle(fa, fb, this.len[2], this.len[3], 1);
        }

        if (o1 == 1 && o2 == 1) {
            if((z[2][1]>127) === (zz[2][1]>127)) {
                filltrace.call(this, z[2], zz[2], o1);
            } else if (z[2][1]>127) {
                filltrace.call(this, z[2], [0, 305], o1);
                ret.push((mpoint = [this.torad(61.35), this.torad(115.6)]));
                filltrace.call(this,  calc.call(this,mpoint),[152,3], 2);
                ret.push((mpoint=[this.torad(331.4), this.torad(318.6)]));//
                filltrace.call(this, calc.call(this,mpoint), zz[2], o1);
            } else if (zz[2][1]>127) {
                filltrace.call(this, z[2], [149, -1], o1);
                ret.push((mpoint = [this.torad(333), this.torad(309)]));
                filltrace.call(this,  calc.call(this,mpoint),[0, 305], 2);
                ret.push((mpoint=[this.torad(62.3), this.torad(116.7)]));//
                filltrace.call(this, calc.call(this,mpoint), zz[2], o1);
            }
        } else if (o1 == 1 && o2 == 2) {
            if(z[2][1]>127) {
                filltrace.call(this, z[2], [0, 305], o1);
                ret.push((mpoint = [this.torad(61.35), this.torad(115.6)]));
            } else {
                filltrace.call(this, z[2], [148,-1], o1);
                ret.push((mpoint = [this.torad(333.21), this.torad(299.6)]));
            }
            filltrace.call(this,  calc.call(this,mpoint), zz[2], o2);
        } else if (o1 == 1 && o2 == 4) {
            if(z[2][1]>127) {
                filltrace.call(this, z[2], [0, 305], o1);
                ret.push((mpoint = [this.torad(61.35), this.torad(115.6)]));
            } else {
                filltrace.call(this, z[2], [-148,-1], o1);
                ret.push((mpoint = [this.torad(243.8), this.torad(206.97)]));
            }
            filltrace.call(this, calc.call(this,mpoint), zz[2], o2);
        } else if (o1 == 1 && o2 == 8) {
            if(z[2][1]>127) {
                filltrace.call(this, z[2], [0, 305], o1);
                ret.push((mpoint = [this.torad(64.35), this.torad(115.64)]));
            } else {
                filltrace.call(this, z[2], [-148,-1], o1);
                ret.push((mpoint = [this.torad(243.8), this.torad(206.97)]));
                filltrace.call(this, calc.call(this,mpoint), [-187,0], 4);
                ret.push((mpoint = [this.torad(263.8), this.torad(179.6)]));
            }
            filltrace.call(this, calc.call(this,mpoint), zz[2], o2);

        } else if (o1 == 2 && o2 == 1) {
            // меняем 1 ногу правую
            filltrace.call(this, z[2], [153, 3], o1);
            ret.push((mpoint=[this.torad(329), this.torad(317)]));
            filltrace.call(this, calc.call(this,mpoint), zz[2], o2);
        } else if (o1 == 2 && o2 == 4) {
            // меняем 1 ногу левую
            filltrace.call(this, z[2], [0, 305], o1);
            ret.push((mpoint=[this.torad(64.35), this.torad(116.7)]));//
            filltrace.call(this, calc.call(this,mpoint), zz[2], o2);
        } else if (o1 == 2 && o2 == 8) {
            filltrace.call(this, z[2], [0, 305], o1);
            ret.push((mpoint=[this.torad(64.35), this.torad(115.64)]));//
            filltrace.call(this, calc.call(this,mpoint), zz[2], o2);

        } else if (o1 == 4 && o2 == 2) {
            // Идем через [0, 305]
            filltrace.call(this, z[2], [0, 305], o1);
            // сменить обе ноги
            ret.push((mpoint=[this.torad(63.27), this.torad(115.64)]));//
            filltrace.call(this, calc.call(this,mpoint), zz[2], o2);
        } else if (o1 == 4 && o2 == 1) {
            if(zz[2][1]>127) {
                filltrace.call(this, z[2], [0, 305], o1);
                ret.push((mpoint=[this.torad(62), this.torad(130)]));//
            } else {
                filltrace.call(this, z[2], [-153, 0], o1);
                ret.push((mpoint=[this.torad(269), this.torad(208)]));//
            }
            filltrace.call(this, calc.call(this,mpoint), zz[2], o2);
        } else if (o1 == 4 && o2 == 8) {
            filltrace.call(this, z[2], [0, 305], o1);
            ret.push((mpoint=[this.torad(66), this.torad(115)]));//
            filltrace.call(this, calc.call(this,mpoint), zz[2], o2);

        } else if (o1 == 8 && o2 == 1) {
            if(zz[2][1]>127) {
                filltrace.call(this, z[2], [0, 305], o1);
                ret.push((mpoint=[this.torad(62), this.torad(130)]));//
            } else {
                filltrace.call(this, z[2], [187, -1], o1);
                ret.push((mpoint=[this.torad(358), this.torad(275)]));//
                filltrace.call(this, calc.call(this,mpoint), [153, 0], 2);
                ret.push((mpoint=[this.torad(333), this.torad(271)]));//
            }
            filltrace.call(this, calc.call(this,mpoint), zz[2], o2);
        } else if (o1 == 8 && o2 == 2) { //0,305 - 69.37-60, 114.32-117
            filltrace.call(this, z[2], [0, 305], o1);
            ret.push((mpoint=[this.torad(60), this.torad(114.32)]));//
            filltrace.call(this, calc.call(this,mpoint), zz[2], o2);
        } else if (o1 == 8 && o2 == 4) {
            filltrace.call(this, z[2], [0, 305], o1);
            ret.push((mpoint=[this.torad(66), this.torad(116.32)]));//
            filltrace.call(this, calc.call(this,mpoint), zz[2], o2);
        } else {
            filltrace.call(this, z[2], zz[2], o1);
        }
        console.log(ret);
        return ret;
    },

    /**
     * пытаемся продвинутьманипулятор_ по возмоБности сохраняя порядок тыг
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
            let fa,fb,o1 = order[0], o2 = order[1], found = false;
            for (var i = 0; i < 4; i++) {
                if (i > 1) o1 = 1 - o1;
                if (i & 1) o2 = 1 - o2;
                fa = this.buildTriangle(this.pointA, aa, this.len[0], this.len[2], o1);
                fb = this.buildTriangle(this.pointB, aa, this.len[3], this.len[1], o2);
                if (isNaN(fb[0]) || isNaN(fa[0])) continue;
                let a = this.angle(fa, aa), b = this.angle(fb, aa);
                console.log([o1,o2]);
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
