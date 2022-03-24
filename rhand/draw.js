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
            aa = this.norm(b + (order > 0 ? a : -a));
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
        // отметить все двойные точки слева 2048 - можно рулить ногой A - _*
        for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
            for (let x = this.realmap_border[0]; x < this.realmap_border[1]; x++) {
                if(this.map[x][y]!=0 && this.map[x][y]!=8) {
                    this.map[x][y] |= 2048;
                }
                if(this.map[x][y]!=0){
                    break;
                }
            }
        }
        // отметить все двойные точки справа 2048 - можно рулить ногой B - *_
        for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
            for (let x = this.realmap_border[1]-1; x > this.realmap_border[0]; x--) {
                if(this.map[x][y]!=0 && this.map[x][y]!=8) {
                    this.map[x][y] |= 1024;
                }
                if(this.map[x][y]!=0){
                    break;
                }
            }
        }
        // отметить ocu
        this.map[-30][0] |= 1024+15;
        this.map[30][0] |= 2048+15;

    },

    /**
     * построить маршрут от точки a до точки b с порядком с
     * @param {any[]} a
     * @param {number} o1
     * @param {any[]} b
     * @param {number} o2
     */
    checkPoints: function (a, o1 , b, o2) {
        // сюда будем бросать длины переходов
        var map = [], trace=[], minpoint=false,minlength=100000,finish=false;
        for (let x = this.realmap_border[0]; x < this.realmap_border[1]; x++) {
            map[x] = [];
            for (let y = this.realmap_border[2]; y < this.realmap_border[3]; y++) {
                map[x][y] = [];
                map[x][y][1]=0;
                map[x][y][2]=0;
                map[x][y][4]=0;
                map[x][y][8]=0;
            }
        }

        // посмотреть вокруг точки
        function lookaround(xx,yy,cc, callback){
            let res=false;
            for (let y = -1; y <= 1; ++y) {
                for (let x = -1; x <= 1; ++x)
                    if (!(x == 0 && y == 0))
                        if (xx + x > this.realmap_border[0] && xx + x < this.realmap_border[1]
                            && yy + y > this.realmap_border[2] && yy + y < this.realmap_border[3]
                            && (this.map[xx + x][yy + y] & cc) > 0) {
                            res |= callback.call(this,xx + x,yy + y,cc,(Math.abs(x) == Math.abs(y)) ? 1.4 : 1);
                        }
            }
            // проверка точек перехода
            // проверка точек перехода
            if((1024 & this.map[xx][yy]) > 0){
                res |= callback.call(this,xx, yy, (cc==1?4:(cc==2?8:(cc==4?1:2))), 1);
            }
            if((2048 & this.map[xx][yy]) > 0){
                res |= callback.call(this,xx, yy, (cc==1?2:(cc==2?1:(cc==4?8:4))), 1);
            }
            return res;
        }

        let p = [[Math.round(a[0] / 5), Math.round(a[1] / 5),o1],
                [Math.round(b[0] / 5), Math.round(b[1] / 5),o2]];
        map[p[0][0]][p[0][1]][p[0][2]] = 1;
        map[p[1][0]][p[1][1]][p[1][2]] = -1;
        let cnt=0;
        //p=[p[0]];
        while (!finish && p.length > 0) {
            var points = [];
            //обходим точки
            for (let i = 0; i < p.length; ++i) {
                // 8 соседних клеток
                let oldv=map[p[i][0]][p[i][1]][p[i][2]];
                lookaround.call(this, p[i][0],p[i][1],p[i][2], function(x,y,c, disp){
                    let v = map[x][y][c],
                        newv = oldv +
                            (oldv < 0 ? -1 : 1) * disp;
                    if (v === 0 || (oldv < 0 ? v < newv : v > newv)) {
                        map[x][y][c] = newv;
                        points.push([x, y, c]);
                    }
                    if (v!==0 && (oldv < 0) === (v > 0)) {
                        let newmin=Math.abs(newv-v);
                        if(minlength>newmin){
                            minpoint=[x,y,c];
                            minlength=newmin;
                        }
                        // встретили точку противоположного знака - финиш
                        finish=true;
                    }
                })
            }
            //повторяем для новых клеток
            p = points;//console.log(cnt++,points.length); // 400 max
        }
        if (minpoint===false) {
            return false;
        } else {
            let maxpoint,min;
            if(map[minpoint[0]][minpoint[1]][minpoint[2]]>0) {
                maxpoint=minpoint;
                //ищем минимальное отрицательное
                min=-1000000;
                lookaround.call(this, maxpoint[0], maxpoint[1], maxpoint[2], function(x,y,c, disp){
                    if(0>map[x][y][c] && min<map[x][y][c]){
                        min=map[x][y][c];
                        minpoint=[x,y,c];
                    }
                });
            } else {
                //ищем минимальное отрицательное
                min=1000000;
                lookaround.call(this, minpoint[0], minpoint[1], minpoint[2], function(x,y,c, disp){
                    if(0<map[x][y][c] && min>map[x][y][c]){
                        min=map[x][y][c];
                        maxpoint=[x,y,c];
                    }
                });
            }
            // сворачиваем трассу
            min=1000000;
            while(min!=1) {
                if(!lookaround.call(this, maxpoint[0], maxpoint[1], maxpoint[2], function (x, y, c, disp) {
                    if (0 < map[x][y][c] && min > map[x][y][c]) {
                        min = map[x][y][c];
                        maxpoint = [x, y, c];
                        return true;
                    }
                })) {
                    break;
                }
                if(Math.abs(maxpoint[0])==30 && maxpoint[1]==0) {
                    trace.unshift([]);
                    continue;
                }
                trace.unshift([5*maxpoint[0],5*maxpoint[1],maxpoint[2]]);
            }

            min=-1000000;
            while(min!=-1) {
                if(!lookaround.call(this, minpoint[0], minpoint[1], minpoint[2], function (x, y, c, disp) {
                    if (0 > map[x][y][c] && min < map[x][y][c]) {
                        min = map[x][y][c];
                        minpoint = [x, y, c];
                        return true;
                    }
                })) {
                    break;
                }
                if(Math.abs(minpoint[0])==30 && minpoint[1]==0) {
                    trace.push([]);
                    continue;
                }
                trace.push([5*minpoint[0],5*minpoint[1],minpoint[2]]);
            }

            if(trace.length>0)trace.shift();
            if(trace.length>0)trace.pop();
            a[2]=o1;b[2]=o2;
            trace.unshift(a);trace.push(b);
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

        function filltrace(a,o1, b, o2) {
            let fa,fb,olda=false,trace = this.checkPoints(a, o1, b, o2);//, v=trace[0][3];
            for (var i = 1; i < trace.length; i++) {
                if(trace[i].length==0) {
                    olda=[fa[2],fb[2]];
                    while(trace[++i].length==0);
                }
                fa = this.buildTriangle(pa, trace[i], this.len[0], this.len[2], (trace[i][2] > 2));
                fb = this.buildTriangle(pb, trace[i], this.len[1], this.len[3], (trace[i][2] == 1 || trace[i][2] == 4));
                if (isNaN(fb[0]) || isNaN(fa[0])) {
                    console.log('Opps!');
                    return;
                }
                if(!!olda){
                    if(Math.abs(fa[2]-olda[0])>Math.PI) {
                        olda[0]+=(fa[2]>olda[0]?2:2)*Math.PI;
                    }
                    if(Math.abs(fb[2]-olda[1])>Math.PI) {
                        olda[1]+=(fb[2]>olda[1]?2:2)*Math.PI;
                    }
                    ret.push([(fa[2]+olda[0])/2, (fb[2]+olda[1])/2]);
                    olda=false;
                }
                ret.push([fa[2], fb[2]]);
            }
        }
        filltrace.call(this, z[2],o1, zz[2], o2);
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
