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
    currentline: '2line',//'line',
    /**
     * временные переменные
     */
    _TO: false, _interval: false,

    /**
     * Сдвинутся на dist пикселей
     * @param x - vector
     * @param dist
     * @returns {*[]}
     */
    moveupto: function (x, dist) {
        let d = this.dist(x);
        return this.moveuptopercent(x, dist / d);
    },
    /**
     * сдвинутся на долю от длины вектора
     * @param x - vector
     * @param dist
     * @returns {*[]}
     */
    moveuptopercent: function (x, dist) {
        return [x.start[0] + dist * (x.fin[0] - x.start[0]), x.start[1] + dist * (x.fin[1] - x.start[1])];
    },
    /**
     * длина вектора
     * @param x - vector
     * @returns {number}
     */
    dist: function (x) {
        return Math.sqrt((x.start[0] - x.fin[0]) * (x.start[0] - x.fin[0]) + (x.start[1] - x.fin[1]) * (x.start[1] - x.fin[1]));
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

        function arc(center, options){
            options = options || {};
            ctx.beginPath();
            ctx.lineWidth = options.lineWidth || 2;
            ctx.strokeStyle = options.color || "white";
            ctx.arc(center[0], center[1], options.radius || 5, (options.start||0)*Math.PI, (options.fin||2) * Math.PI,
                !!(options.over||0));
            ctx.stroke();
        }

        let canvas = this.canvas, d = new Date();
        let ctx = canvas.getContext("2d");
        let canclearpermanent = true; // нужно ли отключать анимацию
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let l of this.lines) {
            let alength = l.dist+0.1; // длина всей линии в пикселях + запас в кусокпикселя на округление
            if (!!l.animation) {
                let p=(d - l.starttime) / l.animation;
                if(p<1)
                    alength = l.dist*p;// длина линии в пикселях, которую нужно нарисовать
            }
            let percent=1;
            for(let a of l.a){
                if(alength<0.05) {
                    percent=0;// не рисуем дальше
                } else if(alength<a.dist){
                    percent=(a.dist-alength)/a.dist;alength=0;// не рисуем часть
                } else {
                    alength-=a.dist;
                }
                if(alength===0){
                    canclearpermanent = false;
                }
                if(a.a==='line' && percent>0){
                    let fin=a.fin;
                    if(percent<1){
                        fin=this.moveuptopercent(a,1-percent);
                    }
                    line(a.start,fin);
                   // console.log(percent,l.dist,alength);
                } else if(a.a==='arc' && percent>0){
                    let fin=a.fin;
                    if(percent<1){
                        fin=a.fin+(percent)*(a.start-a.fin);
                    }
                    arc(a.center,{radius:a.rad, start:a.start, fin: fin,over:a.start>a.fin});
                   // console.log(percent,l.dist,alength);
                } else if(a.a==='circle'){
                    console.log(percent,l.dist,alength);
                    if(alength>0)
                        circle(a.center)
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
        let bound=this.root.getBoundingClientRect()
        this.canvas.setAttribute("height", bound.height);
        this.canvas.setAttribute("width", bound.width);
    },

    todom: function (el){
        if(typeof el === 'string' || el instanceof String){
            el=el.split(':');
            el=document.getElementById(el[0]);
        }
        return el;
    },
    /**
     * добавить еще один элемент анимации
     * @param from - DOM
     * @param to - DOM
     * @param animation - int: микротик - 1000 в секунду.
     */
    newline: function (from,to, animation) {
        from = this.todom(from);
        to = this.todom(to);
        let start = from.getBoundingClientRect();
        let fin = to.getBoundingClientRect();
        let border = this.root.getBoundingClientRect();

        let xstart = [start.left - border.left + start.width / 2, start.top - border.top + start.height / 2],
            ystart = [fin.left - border.left, fin.top - border.top + fin.height / 2];
        let line = {a: []}, dist = 0;
        if (this.currentline === 'line') {
            // линия от старта до финиша, со смещением до границы
            xstart = anima.moveupto({start: xstart, fin: ystart}, start.width / 2 + 1);
            let vector = {a: 'line', start: xstart, fin: ystart};
            vector.dist = this.dist(vector);
            line.a.push(vector);
            dist += vector.dist;
            line.a.push({a: 'circle', center: ystart, dist: 0});

            line.dist = dist;
            line.animation = animation || 0;
            if (!!animation) {
                line.starttime = new Date();
            }
        } else if(this.currentline === '2line') {
            // линия вертикально-горизонтально
            // первый отрезок вверх ?
            let fin0,l,l0,arc=false;
            if(xstart[1]<ystart[1]) { // да , длина - минимум 5
                xstart = [xstart[0],xstart[1]+start.width / 2 + 1];
                fin0=[xstart[0],xstart[1]+Math.max(5,ystart[1]-xstart[1])];
            } else {
                xstart = [xstart[0],xstart[1]-start.width / 2 + 1];
                fin0=[xstart[0],xstart[1]-Math.max(5,xstart[1]-ystart[1])];
            }
            l0={a:'line',start:xstart,fin: [fin0[0],fin0[1]]};
            l= {a:'line',start:[fin0[0],fin0[1]],fin: ystart};
            // so arc
            l.dist=this.dist(l);
            l0.dist=this.dist(l0);
            if(l.dist>10 && l0.dist>10){
                // рисуем арк
                if(xstart[0]<ystart[0] && xstart[1]<ystart[1]){
                    l0.fin[1]-=10;
                    l.start[0]+=10;
                    arc={a:'arc', center:[l.start[0],l0.fin[1]],rad:10, start:1,fin:0.5}
                } else if(xstart[0]<ystart[0] && xstart[1]>ystart[1]){
                    l0.fin[1]+=10;
                    l.start[0]+=10;
                    arc={a:'arc', center:[l.start[0],l0.fin[1]],rad:10, start:1,fin:1.5}
                } else if(xstart[0]>ystart[0] && xstart[1]>ystart[1]){
                    l0.fin[1]+=10;
                    l.start[0]-=10;
                    arc={a:'arc', center:[l.start[0],l0.fin[1]],rad:10, start:2,fin:1.5}
                } else if(xstart[0]>ystart[0] && xstart[1]<ystart[1]){
                    l0.fin[1]-=10;
                    l.start[0]-=10;
                    arc={a:'arc', center:[l.start[0],l0.fin[1]],rad:10, start:0,fin:0.5}
                }
                l.dist=this.dist(l);
                l0.dist=this.dist(l0);

            }
            line.dist=0;
            line.a.push(l0);
            if(!!arc) {
                arc.dist=0.5*Math.PI*10;
                line.dist+=arc.dist;
                line.a.push(arc);
            }
            line.a.push(l);
            line.dist += l.dist+l0.dist;
            line.animation = animation || 0;
            if (!!animation) {
                line.starttime = new Date();
            }
        }
        this.lines.push(line);
        this.permanentdraw();
    }
}
$(function () {

    anima.root=$('.container')[0];
    anima.canvas=$('.container canvas')[0];
    /**
     * Изменение окна броузера
     */
    $(window).on('resize', function () {
        anima.resize()//
        anima.lines = []; // пока вот так вот просто, без пересчета
        $('[data-anchor]').each(function () {
            if ($(this).data('complete')) {
                anima.newline(this, $(this).data('anchor'));
            }
        })
        anima.draw();
    }).trigger('resize');
    $(document).on('mouseenter click', '[data-anchor]', function () {
        if (!$(this).data('complete')) {
            $(this).data('complete', 'complete'); // больше не будем реагировать
            anima.newline(this, $(this).data('anchor'), 5000);
        }
    })
})
