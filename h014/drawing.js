/**
 * Объект, осуществляющий вычисления. Некоторые неявные типы
 * -- <<point>>>> - [x,y] - координаты точки {x,y}
 * -- <<vector>>>> - {start: <<point>>, fin: <<point>>}
 * @type {{_interval: boolean, moveupto: (function(*, *): *[]), newline: anima.newline, permanentdraw: anima.permanentdraw, clearpermanent: anima.clearpermanent, moveuptopercent: (function(*, *): *[]), dist: (function(*): number), resize: anima.resize, _draw: anima._draw, _TO: boolean, draw: anima.draw, lines: *[]}}
 */
let anima = {
    root: null,
    canvas: null,
    /* массив линий */
    lines: [],
    /* список дефолтных генераторов линий в порядке предпочтений */
    currentline: [
        'vhv', // вертикально, горизонтально, вертикально ! есть расстояние для скругления, расположено слева от точки назначения
        'hvh', // горизонтально, скругление, вертикально, скругление, горизонтально ! есть расстояние для скругления
        'vh', // вертикально, скругление, горизонтально ! есть расстояние для скругления, расположено слева от точки назначения
        'line'  // просто по прямой
    ],
    /**
     * временные переменные
     */
    _TO: false, _interval: false,

    /**
     * Сдвинутся на dist пикселей
     * @param x - vector
     * @param dist
     * @param fromfin
     * @returns {*[]}
     */
    moveupto: function (x, dist, fromfin) {
        let d = this.dist(x);
        return this.moveuptopercent(x, dist / d, fromfin);
    },
    /**
     * сдвинутся на долю от длины вектора
     * @param x - vector
     * @param dist
     * @param fromfin
     * @returns {*[]}
     */
    moveuptopercent: function (x, dist, fromfin) {
        if (!fromfin)
            return [x.start[0] + dist * (x.fin[0] - x.start[0]), x.start[1] + dist * (x.fin[1] - x.start[1])];
        else
            return [x.fin[0] - dist * (x.fin[0] - x.start[0]), x.fin[1] - dist * (x.fin[1] - x.start[1])];

    },
    /**
     * длина вектора
     * @param x - vector
     * @returns {number}
     */
    distI: function (x, y) {
        return Math.sqrt((x[0] - y[0]) * (x[0] - y[0]) + (x[1] - y[1]) * (x[1] - y[1]));
    },
    /**
     * длина вектора
     * @param x - vector
     * @returns {number}
     */
    dist: function (x) {
        return this.distI(x.start, x.fin);
    },

    /**
     * Инициирует непрерывную перерисовку контента. Для плавной анимации.
     */
    permanentdraw: function () {
        if (!!this._interval) return;
        this._interval = setInterval(() => anima.draw(), 10);
    },
    /**
     * останавливает анимацию
     */
    clearpermanent: function () {
        if (!this._interval) return;
        clearInterval(this._interval);
        this._interval = null;
    },

    /**
     * отложенный draw - заявка на перерисовку. Можно частить, все равно не должно тормозить
     */
    draw: function () {
        if (!this._TO) {
            let that = this;
            this._TO = window.requestAnimationFrame(function () {
                that._TO = false;
                that._draw();
            });
        }
    },


    /* настоящая перерисовка канваса */
    _draw: function () {
        /**
         * Вспомогательная функция для рисования линии
         * @param a - point
         * @param b - point
         * @param options - {lineCap:<<"butt"|"round"|"square">>, lineWidth:<<int>>, color:<<color>>}
         */
        function line(a, b, options) {
            options = options || {};
            ctx.beginPath();
            ctx.lineCap = options.lineCap || "round";
            ctx.lineWidth = options.lineWidth || 2;
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.strokeStyle = options.color || "white";
            ctx.stroke();
        }

        function arrow(aa, options) {
            options = options || {};
            let a = anima.moveupto(aa.vector, 5, true);
            let dist = [aa.vector.fin[0] - a[0], aa.vector.fin[1] - a[1]];
            ctx.lineWidth = options.lineWidth || 1;
            ctx.fillStyle = options.fillStyle || "gray";
            ctx.strokeStyle = options.color || "white";
            ctx.beginPath();
            ctx.moveTo(a[0] + 2 * dist[0], a[1] + 2 * dist[1]);
            ctx.lineTo(a[0] + dist[1], a[1] - dist[0]);
            ctx.lineTo(a[0] - dist[1], a[1] + dist[0]);
            ctx.lineTo(a[0] + 2 * dist[0], a[1] + 2 * dist[1]);
            ctx.closePath();
            ctx.fillStyle = options.fillStyle || "gray";
            ctx.fill();
            ctx.stroke();

        }

        /**
         * Вспомогательная функция для рисования круга c границей
         * @param a - point
         * @param options - {radius:<<int>>, lineWidth:<<int>>, color:<<color>>, fillStyle:<<string>>}
         */
        function circle(a, options) {
            options = options || {};
            ctx.beginPath();
            ctx.lineWidth = options.lineWidth || 1;
            ctx.strokeStyle = options.color || "white";
            ctx.arc(a[0], a[1], options.radius || 5, 0, 2 * Math.PI);
            ctx.fillStyle = options.fillStyle || "gray";
            ctx.fill();
            ctx.stroke();
        }

        function arc(center, options) {
            options = options || {};
            ctx.beginPath();
            ctx.lineWidth = options.lineWidth || 2;
            ctx.strokeStyle = options.color || "white";
            ctx.arc(center[0], center[1], options.radius || 5, (options.start || 0) * Math.PI, (options.fin || 2) * Math.PI,
                !!(options.over || 0));
            ctx.stroke();
        }

        let canvas = this.canvas, d = new Date();
        let ctx = canvas.getContext("2d");
        let canclearpermanent = true; // нужно ли отключать анимацию
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let l of this.lines) {
            let alength = l.dist + 0.1; // длина всей линии в пикселях + запас в кусокпикселя на округление
            if (!!l.animation) {
                let p = (d - l.starttime) / l.animation;
                if (p < 1)
                    alength = l.dist * p;// длина линии в пикселях, которую нужно нарисовать
            }
            let percent = 1;
            for (let a of l.a) {
                if (alength < 0.05) {
                    percent = 0;// не рисуем дальше
                } else if (alength < a.dist) {
                    percent = (a.dist - alength) / a.dist;
                    alength = 0;// не рисуем часть
                } else {
                    alength -= a.dist;
                }
                if (alength === 0) {
                    canclearpermanent = false;
                }
                if (a.a === 'line' && percent > 0) {
                    let fin = a.fin;
                    if (percent < 1) {
                        fin = this.moveuptopercent(a, 1 - percent);
                    }
                    line(a.start, fin);
                    // console.log(percent,l.dist,alength);
                } else if (a.a === 'arc' && percent > 0) {
                    let fin = a.fin;
                    if (percent < 1) {
                        fin = a.fin + (percent) * (a.start - a.fin);
                    }
                    arc(a.center, {radius: a.rad, start: a.start, fin: fin, over: a.start > a.fin});
                    // console.log(percent,l.dist,alength);
                } else if (a.a === 'circle') {
                    //console.log(percent, l.dist, alength);
                    if (alength > 0)
                        circle(a.center)
                } else if (a.a === 'arrow') {
                    //console.log(percent, l.dist, alength);
                    if (alength > 0)
                        arrow(a)
                }
            }
        }
        if (canclearpermanent) {
            this.clearpermanent();
        }
    },
    /**
     * обработка ресайза, просто установка габаритов канваса.
     * @param bound
     */
    resize: function () {
        let bound = this.root.getBoundingClientRect()
        this.canvas.setAttribute("height", bound.height);
        this.canvas.setAttribute("width", bound.width);
    },

    todom: function (el) {
        if (typeof el === 'string' || el instanceof String) {
            let m = el.match(/^(.*?)\:eq\((\d)\)$/);
            if (!!m) {
                el = document.querySelectorAll(m[1])[m[2]];
            } else {
                el = document.querySelector(el);
            }
        }
        return el;
    },

    // соединяем 2 прямоугольных стыкующихся отрезка, вставляя между ними четверть дуги.
    connectWarc: function (l, l0) {
        l.dist = anima.dist(l);
        l0.dist = anima.dist(l0);
        let radius = 7;
        let arc = null, xstart = l0.start, ystart = l.fin;
        if (l.dist > radius && l0.dist > radius) {
            // первый вектор горизонтален?
            let diff = null;
            if (l0.fin[0] == l0.start[0]) {
                if (xstart[0] < ystart[0] && xstart[1] < ystart[1]) diff = [-radius, radius, 1, 0.5];
                else if (xstart[0] < ystart[0] && xstart[1] > ystart[1]) diff = [radius, radius, 1, 1.5]; //!
                else if (xstart[0] > ystart[0] && xstart[1] < ystart[1]) diff = [-radius, -radius, 0, 0.5];//?
                else if (xstart[0] > ystart[0] && xstart[1] > ystart[1]) diff = [radius, -radius, 2, 1.5];
                if (!!diff) {
                    l.start[0] += diff[1];
                    l0.fin[1] += diff[0];
                    arc = {a: 'arc', center: [l.start[0], l0.fin[1]], rad: radius, start: diff[2], fin: diff[3]}
                }
            } else {
                // рисуем арк
                if (xstart[0] < ystart[0] && xstart[1] < ystart[1]) diff = [-radius, radius, 1.5, 2];
                else if (xstart[0] < ystart[0] && xstart[1] > ystart[1]) diff = [-radius, -radius, 0.5, 0];
                else if (xstart[0] > ystart[0] && xstart[1] > ystart[1]) diff = [radius, -radius, 0.5, 1];
                else if (xstart[0] > ystart[0] && xstart[1] < ystart[1]) diff = [radius, radius, 1.5, 1];
                if (!!diff) {
                    l0.fin[0] += diff[0];
                    l.start[1] += diff[1];
                    arc = {a: 'arc', center: [l0.fin[0], l.start[1]], rad: radius, start: diff[2], fin: diff[3]}
                }
            }

            l.dist = anima.dist(l);
            l0.dist = anima.dist(l0);
            if (!!arc) arc.dist = 0.5 * Math.PI * radius;
            return arc;
        }
    },

    line: {
        allow: function (start, fin, border) {
            return true;
        },
        produce: function (line, start, fin, border, animation) {
            // линия от старта до финиша, со смещением до границы
            let xstart = [start.left - border.left + start.width / 2, start.top - border.top + start.height / 2],
                ystart = [fin.left - border.left + fin.width / 2, fin.top - border.top + fin.height / 2];
            if (xstart[0] < ystart[0]) {
                ystart[0] -= fin.width / 2;
            } else {
                ystart[0] += fin.width / 2;
            }
            xstart = anima.moveupto({start: xstart, fin: ystart}, start.width / 2 + 1);
            let vector = {a: 'line', start: xstart, fin: ystart};
            vector.fin = anima.moveupto(vector,5,true);
            vector.dist = anima.dist(vector);
            line.a.push(vector);
            //line.a.push({a: 'circle', center: ystart, dist: 0});
            line.a.push({a: 'arrow', vector: vector, dist: 0});

            line.dist = vector.dist;
            line.animation = animation || 0;
            if (!!animation) {
                line.starttime = new Date();
            }
        }
    },

    "vh": {
        allow: function (start, fin, border) {
            let xstart = [start.left - border.left + start.width / 2, start.top - border.top + start.height / 2],
                ystart = [fin.left - border.left, fin.top - border.top + fin.height / 2];
            // нельзя проводить, если линии почти на одной горизонтальной линии - нет запаса в 10+10
            if (Math.abs(xstart[1] - ystart[1]) - start.width / 2 < 10) return false;
            // нельзя проводить, если линии почти на одной линии или правее в 10+10
            if (ystart[0] - xstart[0] - start.width / 2 < 10) return false;
            return true;
        },
        produce: function (line, start, fin, border, animation) {
            let xstart = [start.left - border.left + start.width / 2, start.top - border.top + start.height / 2],
                ystart = [fin.left - border.left, fin.top - border.top + fin.height / 2];
            // линия вертикально-горизонтально
            // первый отрезок вверх ?
            let fin0, l, l0;
            if (xstart[1] < ystart[1]) { // вниз или вверх?
                xstart = [xstart[0], xstart[1] + start.width / 2 + 1];
                fin0 = [xstart[0], xstart[1] + Math.max(5, ystart[1] - xstart[1])];
            } else {
                xstart = [xstart[0], xstart[1] - start.width / 2 + 1];
                fin0 = [xstart[0], xstart[1] - Math.max(5, xstart[1] - ystart[1])];
            }
            l0 = {a: 'line', start: xstart, fin: [fin0[0], fin0[1]]};
            l = {a: 'line', start: [fin0[0], fin0[1]], fin: ystart};
            // so arc
            let arc = anima.connectWarc(l, l0);

            line.dist = 0;
            line.a.push(l0);
            if (!!arc) {
                line.dist += arc.dist;
                line.a.push(arc);
            }
            line.a.push(l);
            line.a.push({a: 'circle', center: [l.fin[0], l.fin[1]], dist: 0});
            line.dist += l.dist + l0.dist;
            line.animation = animation || 0;
            if (!!animation) {
                line.starttime = new Date();
            }
        }
    },
    "hvh": {
        produceTrace: function (start, fin, border) {
            let xstart = [start.left - border.left + start.width / 2, start.top - border.top + start.height / 2],
                ystart = [fin.left - border.left + fin.width / 2, fin.top - border.top + fin.height / 2];
            // линия горизонтально-вертикально-горизонтально
            let d = 5, p0, p1 = false, p2; //- 3 реперные точки нашей линии
            // старт и финиш?
            // попытка соединится напрямую слева направо
            p0 = [xstart[0] + start.width / 2 + 1, xstart[1]];
            p2 = [ystart[0] - fin.width / 2 - d, ystart[1]];
            if (xstart[0] > p2[0] || p0[0] + 10 > p2[0] ||
                2 * 7 > Math.min(
                    Math.abs(p0[0] - p2[0]), Math.abs(p0[1] - p2[1])
                )
            ) {
                // нельзя, делаем справа-налево
                p0 = [xstart[0] - start.width / 2 - 1, xstart[1]];
                p2 = [ystart[0] + fin.width / 2 + d, ystart[1]];
                if (xstart[0] < p2[0] || p2[0] + 10 > p0[0] ||
                    2 * 7 > Math.min(
                        Math.abs(p0[0] - p2[0]), Math.abs(p0[1] - p2[1])
                    )) {
                    // опять нельзя, делаем влево, вниз направо
                    // выносим перегиб влево на 40 пх
                    p0 = [xstart[0] - start.width / 2 - 1, xstart[1]];
                    p2 = [ystart[0] - fin.width / 2 - d, ystart[1]];
                    p1 = [Math.min(p0[0], p2[0]) - 40, (p0[1] + p2[1]) / 2];
                }
            }

            if (!p1) {
                // y координата - ближайшая кратная 10
                // border.top+(border.height/10)
                let xb=(border.width/10);
                p1 = [Math.round(((p0[0] + p2[0]) / 2)/xb)*xb,(p0[1] + p2[1]) / 2];
            }
            return [
                p0,
                p1,// точка перегиба
                p2];
        },
        allow: function (start, fin, border) {
            let p = this.produceTrace(start, fin, border);
            // проверяем, что удастся 2 раза скруглить линии
            if (7 > Math.min(
                Math.abs(p[0][0] - p[1][0]),
                Math.abs(p[2][0] - p[1][0]),
                Math.abs(p[0][1] - p[1][1]),
                Math.abs(p[2][1] - p[1][1])
            )) return false;
            return true;
        },
        produce: function (line, start, fin, border, animation) {
            let p = this.produceTrace(start, fin, border);

            anima.buildline(line, {a: 'line', start: [p[0][0], p[0][1]], fin: [p[1][0], p[0][1]]},
                {a: 'line', start: [p[1][0], p[0][1]], fin: [p[1][0], p[2][1]]},
                {a: 'line', start: [p[1][0], p[2][1]], fin: [p[2][0], p[2][1]]},
                animation);
        }
    },

    vhv: {
        produceTrace: function (start, fin, border) {
            let xstart = [start.left - border.left + start.width / 2, start.top - border.top + start.height / 2],
                ystart = [fin.left - border.left + fin.width / 2, fin.top - border.top + fin.height / 2];
            // линия вертикально-горизонтально-вертикальная
            let d = 5, p0, p1 = false, p2; //- 3 реперные точки нашей линии
            // старт и финиш?
            // попытка соединится напрямую сверху вниз
            p0 = [xstart[0], xstart[1] + start.height / 2 + 1];
            p2 = [ystart[0], ystart[1] - fin.height / 2 - d];
            if (xstart[1] > p2[1] || p0[1] + 14 > p2[1]) { // не с той стороны или слишком близко перегиб
                // нельзя, делаем снизувверх
                p0 = [xstart[0], xstart[1] - start.height / 2 - 1];
                p2 = [ystart[0], ystart[1] + fin.height / 2 + d];
                if (xstart[1] < p2[1] || p2[1] + 14 > p0[1]) { // не с той стороны или слишком близко перегиб
                    // опять нельзя, выносим перегиб вниз на 40 пх
                    p0 = [xstart[0], xstart[1] + start.height / 2 + 1];
                    p2 = [ystart[0], ystart[1] + fin.height / 2 + d];
                    p1 = [(p0[0] + p2[0]) / 2, Math.max(p0[1], p2[1]) + 40];
                }
            }
            if (Math.abs(p0[0]-p2[0]) < 20) return false;

            if (!p1) {
                p1 = [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2];
            }
            return [
                p0,
                p1,// точка перегиба
                p2];
        },
        allow: function (start, fin, border) {
            let p = this.produceTrace(start, fin, border);
            if(!p) return false;
            // проверяем, что удастся 2 раза скруглить линии
            if (fin.width > 30) return false; // todo: временно, для отладки включаем в общий поток
            return true;
        },
        produce: function (line, start, fin, border, animation) {
            let p = this.produceTrace(start, fin, border);

            anima.buildline(line, {a: 'line', start: [p[0][0], p[0][1]], fin: [p[0][0], p[1][1]]},
                {a: 'line', start: [p[0][0], p[1][1]], fin: [p[2][0], p[1][1]]},
                {a: 'line', start: [p[2][0], p[1][1]], fin: [p[2][0], p[2][1]]},
                animation);
        }
    },

    buildline: function (line, l0, l1, l2, animation) {
        // первый отрезок
        let arc01 = anima.connectWarc(l1, l0),
            arc12 = l2 && anima.connectWarc(l2, l1);
        line.a.push(l0);
        if (!!arc01) line.a.push(arc01);
        line.a.push(l1);
        if (!!arc12) line.a.push(arc12);
        l2 && line.a.push(l2);
        line.dist = 0;
        for (let x of line.a) if (!!x.dist) line.dist += x.dist;

        line.a.push({a: 'arrow', vector: l2, dist: 0});
        //   line.a.push({a: 'circle', center: [l2.fin[0], l2.fin[1]], dist: 0});
        line.animation = animation || 0;
        if (!!animation) {
            line.starttime = new Date();
        }
    },
    /**
     * добавить еще один элемент анимации
     * @param from - array|HTMLDomElement
     * @param to - DOM
     * @param animation - int: микротик - 1000 в секунду.
     */
    newline: function (from, to, animation) {
        from = this.todom(from);
        to = this.todom(to);
        let start = from.getBoundingClientRect();
        let fin = to.getBoundingClientRect();
        let border = this.root.getBoundingClientRect();

        let line = {a: []}, dist = 0;
        for (const cl of this.currentline) {
            if (this[cl].allow(start, fin, border)) {
                this[cl].produce(line, start, fin, border, animation);
                break;
            }
        }
        this.lines.push(line);
        this.permanentdraw();
    }
}
$(function () {

    anima.root = $('.container')[0];
    anima.canvas = $('.container canvas')[0];

    /**
     * Изменение окна броузера
     */
    function aredraw() {
        anima.lines = []; // пока вот так вот просто, без пересчета
        $('[data-anchor]').each(function () {
            if ($(this).data('complete')) {
                let x = $(this).data('anchor').split(';');
                for (const xx of x)
                    anima.newline(this, xx);
            }
        })
        anima.draw();
    }

    $(window).on('resize', function () {
        anima.resize()//
        aredraw();
    }).trigger('resize');
    $(document).on('mouseenter click', '[data-anchor]', function () {
        if (!$(this).data('complete')) {
            $(this).data('complete', 'complete'); // больше не будем реагировать
            let x = $(this).data('anchor').split(';');
            for (const xx of x)
                anima.newline(this, xx, 1000);
        }
    })
    const draggableElements = document.querySelectorAll('div[draggable="true"]');
    let disp = [], tgt = null;

    function movetgt(event, clear) {
        tgt.style.left = event.screenX + disp[0] + 'px';
        tgt.style.top = event.screenY + disp[1] + 'px';
        aredraw();
        event.preventDefault();
        if (!!clear)
            event.dataTransfer.clearData();
    }

    for (const e of draggableElements) {
        e.addEventListener("dragstart", (event) => {
            // console.log(event);
            tgt = event.target;
            event.dataTransfer.clearData();
            event.dataTransfer.effectAllowed = 'move';
            var img = document.createElement("img");
            img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQMAAAAl21bKAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAApJREFUCNdjYAAAAAIAAeIhvDMAAAAASUVORK5CYII=";
            event.dataTransfer.setDragImage(img, 0, 0);
            disp = [
                parseInt(tgt.style.left) - event.screenX,
                parseInt(tgt.style.top) - event.screenY
            ];
        });
    }
    const dropElement = document.querySelector("div.foo");

    dropElement.addEventListener("dragenter", (event) => {
        event.preventDefault();
    });
    dropElement.addEventListener("dragstop", (event) => {
        movetgt(event, true)
    });
    dropElement.addEventListener("drop", (event) => {
        movetgt(event, true)
    });
    dropElement.addEventListener("dragover", function (event) {
        movetgt(event);
    });
})