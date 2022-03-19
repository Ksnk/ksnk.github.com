window.rhand = {

    // состояние шаговых двигателей
    pointA: [0, 0, Math.PI * (40 / 180)], // x,y, angle
    pointB: [300, 0, Math.PI * (90 / 180)], // x,y, angle
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
    zoompoint: [180, 440],

    //
    map: false,
    mapcolor: 1,

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

    /**
     * расстояние между точками
     * @param fa
     * @param fb
     * @returns {number}
     */
    disp: function (fa, fb) {
        let dx = fa[1] - fb[1], dy = fa[0] - fb[0];
        return Math.sqrt(dx * dx + dy * dy);
    },

    // по указанным углам расчитываем конечные точки тяг манипулятора
    calculate: function () {
        let x = this.calc_silent(this.pointA, this.pointB);
        this.finA = x[0];
        this.finB = x[1];
        this.finC = x[2];
    },

    // достроить треугольник на отрезке fa-fb c длинами la-lb, 1-слева 0-справа
    angle: function(fa,fb){
        let
            dx = fa[0] - fb[0],
            dy = fa[1] - fb[1], b;
        if (Math.abs(dx) < 0.00001) {
            if (dy < 0) {
                b = Math.PI / 2;
            } else {
                b = -Math.PI / 2
            }
        } else {
            b = Math.atan(dy / dx); // угол наклона основы
            if(dx>0){
                b+=Math.PI;
            }
        }
        return b;
    },
    /**
     * достраиваем треугольник на отрезка fa-fb. со стороны order
     * скрытый эффект - дописываем угол наклона в первую точку
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
            b=this.angle(fa,fb),
            d = Math.sqrt(dx * dx + dy * dy),
            a = Math.acos(d  / (la + lb));
        fa[2] = b + (order > 0 ? a : -a);
        return [
            fa[0] + la * Math.cos(fa[2]),
            fa[1] + la * Math.sin(fa[2]),
            fa[2]
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
            x = this.buildTriangle(fa, fb, this.len[2], this.len[3], 1);
        // расчет положения активной точки
        return [fa, fb, x];
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

        this.calculate();
        ctx.clearRect(0, 0, canvas.width, canvas.height);


        let colors = [
            [1, "rgb(177,100,185,0.3)"],
            [2, "rgb(100,185,185,0.3)"],
            [4, "rgb(100,185,104,0.3)"],
            [8, "rgb(185,100,117,0.3)"],
        ];
        let m, c, colormap = [];

        if (this.mapcolor > 0) {
            for (let x = -20; x < 80; x++) for (let y = -60; y < 80; y++) {
                if ((m = (this.map[x][y] & this.mapcolor)) > 0) {
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

    mapit: function () {
        let pa = [...this.pointA], pb = [...this.pointB];
        this.map = [];
        for (let x = -20; x < 80; x++) {
            this.map[x] = [];
            for (let y = -60; y < 80; y++) {
                this.map[x][y] = 0;

                let z = [5 * x , 5 * y ], o1 = 1, o2 = 0;
                for (var i = 0; i < 4; i++) {
                    if (i == 2) o1 = 1 - o1;
                    if (i & 1) o2 = 1 - o2;
                    this.buildTriangle(pa, z, this.len[0], this.len[2], o1);
                    this.buildTriangle(pb, z, this.len[1], this.len[3], o2);
                    let zz = this.calc_silent(pa, pb);
                    if (this.disp(zz[2], z) < 2) {
                        this.map[x][y] |= 1 << (o1 * 2 + o2);
                    }
                }
            }
        }
    },

    /**
     * расчитать движение манипулятора к новой точке от старого положения
     * тупо, без полного перебора
     * @param a
     */
    moveTo: function (a) {
        let z = this.calc_silent(this.pointA, this.pointB),
            log = [], order = [0, 0];
        // cчитаем порядок
        let x = this.buildTriangle(z[2], this.pointA, this.len[2], this.len[0], order[0]),
            y = this.buildTriangle(z[2], this.pointB, this.len[3], this.len[1], order[1]);
        if (this.disp(x, z[0]) < 2) {
            order[0] = 1 - order[0];
        }
        if (this.disp(y, z[1]) < 2) {
            order[1] = 1 - order[1];
        }
        //this.mapit(z, order);

        // двигаемся по 5 см от точки z[2] до точки a
        let d = this.disp(a, z[2]), dst = 10,
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
            let o1 = order[0], o2 = order[1], found = false;
            for (var i = 0; i < 4; i++) {
                if (i > 1) o1 = 1 - o1;
                if (i & 1) o2 = 1 - o2;
                this.buildTriangle(this.pointA, aa, this.len[0], this.len[2], o1);
                this.buildTriangle(this.pointB, aa, this.len[1], this.len[3], o2);
                z = this.calc_silent(this.pointA, this.pointB);
                if (this.disp(z[2], aa) < 2) {
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
            log.push([this.pointA[2], this.pointB[2]]);
        }
        this.pointA[2] = olda, this.pointB[2] = oldb;
        //console.log(log);
        return log;
    }
};
