$(function () {

    /**
     * отложенный draw - заявка на перерисовку. Можно частить, все равно не должно тормозить
     */
    function draw() {
        if (!draw._TO && !draw._internal) {
            draw._TO = window.requestAnimationFrame(function () {
                draw._TO = false;
                window.rhand.draw();
                updatectrl();
            });
        }
    }

    /**
     * отложенный updatectrl
     */
    function updatectrl() {
        if (!updatectrl._TO) {
            updatectrl._TO = setTimeout(function () {
                updatectrl._TO = false;
                draw._internal = true;
                handle(['updatectrl']);
                draw._internal = false;
            }, 100);
        }
    }

    function drawTrace() {
        $('#programm tr:not(:first)').remove();
        let pa=[...rhand.pointA],pb=[...rhand.pointB];
        for (let i = 0; i < rhand.trace.length; i++) {
            if (rhand.trace[i]) {
                pa[2]=rhand.trace[i][0],pb[2]=rhand.trace[i][1];
                let z=rhand.calc_silent(pa,pb);
                rhand.trace[i][2]=z[2];
                $('#programm tbody').append("<tr data-data='" + JSON.stringify(rhand.trace[i]) +
                    "'><td>" + rhand.tograd(rhand.norm(rhand.trace[i][0])) + '</td><td>' + rhand.tograd(rhand.norm(rhand.trace[i][1])) + '</td><td></td><td></td></tr>');
            }
        }
        rhand.svgcache=[];
        draw();
    }

    /**
     * вспомогательная функция парсинга данных из атрибута разметки.
     * Удобно для ручного заполнения, работает с Реактом
     * @example
     * data-handle='["rotate",1,-1]'
     * data-handle="rotate,1,-1"
     */
    function parseData(data) {
        if (typeof data === 'object')
            return data;
        if (data.match(/^[{\[].*[}\]]$/))
            return JSON.parse(data);
        else
            return data.split(/\s*,\s*/);
    }

    /**
     * анимировать перемещение манипулятора
     * @param {{x:number,y:number}[]}trace
     */
    function play(trace) {
        let cur = 0;play.stop=false;
        if (!!play.i) clearInterval(play.i);
        play.i = setInterval(function () {
            if (cur >= trace.length || play.stop) {
                clearInterval(play.i);
                play.i = false;
                updatectrl();
                return;
            }
            rhand.pointA[2] = trace[cur][0];
            rhand.pointB[2] = trace[cur][1];
            draw();
            cur++;

        }, 50);
    }

    /**
     * выдать значение по адресной последовательности
     * @param addr
     * @returns {any}
     * @private
     */
    function _get(addr) {
        let undef, name = addr.split('.'), r = rhand;
        while (name.length > 0) {
            if (undef == (r = r[name.shift()])) return;
        }
        return r;
    }

    /**
     * по адресной последовательности присвоить значение
     * @param addr
     * @param val
     * @private
     */
    function _set(addr, val) {
        let undef, name = addr.split('.'), r = rhand;
        while (name.length > 1) {
            if (undef == (r = r[name.shift()])) return;
        }
        r[name] = val;
    }

    /**
     * универсальный обработчик событий программы,
     * @example:
     * - handle(['rotate',1,-1]) - с параметрами
     * - handle([['rotate',1,-1],['rotate',1,-1],['rotate',1,-1],['rotate',1,-1]])
     *  -- несколько команд в одном флаконе, удобно для ajax
     */
    window.handle = function (whattodo) {
        var pa, pb, reason = whattodo[0] || '';
        if (whattodo && whattodo[0] && whattodo[0].constructor && whattodo[0].constructor === Array) {
            // нам передан массив массивов
            for (var x in whattodo) {
                handle.call(this, whattodo[x])
            }
            return false; // в этом случае нет возможности выдать другой результат
        }
        switch (reason) {
            case 'letsfly':
                var elem = document.createElement('script');
                elem.type = 'text/javascript';
                elem.async = true;
                document.body.appendChild(elem);
                elem.src = location.href.replace(/\/rhand.*$/, '/Fly/fly.js');
                break;
            case 'pin': // забрать имеющиеся значения манипулятора и поставить в нужные значения
                if (whattodo[1] == 'angle') {
                    _set(whattodo[2], [rhand.pointA[2], rhand.pointB[2]]);
                } else {
                    _set(whattodo[2], [rhand.finC[0], rhand.finC[1]]);
                }
                updatectrl();
                break;
            case 'rotate':
                pa = _get(whattodo[1])[2];
                _get(whattodo[1])[2] += rhand.torad(whattodo[2]);
                // проверка, не криво ли стоим ?
                let x = rhand.calc_silent(rhand.pointA, rhand.pointB);
                if (isNaN(x[2][0])) {
                    _get(whattodo[1])[2] = pa;
                }
                draw();
                break;
            case "submitdraw":
                // изменение контрола и redraw
                let i = $(this), name = i.attr('name').split('[]'), multy = name.length > 1;
                name = name[0].split('.');
                let r = rhand;
                while (name.length > 1) {
                    r = r[name.shift()];
                }
                name = name[0];
                if (i.is('input:checkbox')) {
                    if (multy) {
                        if (i[0].checked) {
                            r[name] |= i[0].value;
                        } else {
                            r[name] &= ~i[0].value;
                        }
                    } else {
                        if (i[0].checked) {
                            r[name] = i[0].value;
                        } else {
                            r[name] = null;
                        }
                    }
                } else if (i.is('input:text')) {
                    if (!multy) {
                        r[name] = 0 + i.val();
                        if (whattodo[1] === 'grad') {
                            r[name] = rhand.torad(r[name]);
                        }
                    }
                }
                updatectrl();
                draw();
                return true;
            case "updatectrl":
                // ищем все контролы прямого отображения и обновляем
                $('input[data-handle]').each(function () {
                    let
                        h = parseData($(this).attr('data-handle')),
                        name = ($(this).attr('name') || '').split('[]'), multy = name.length > 1,
                        v = _get(name[0]);

                    if ($(this).is('input:text')) {
                        if (h[1] == 'grad') {
                            $(this).val(rhand.tograd(v));
                        } else {
                            $(this).val(v);
                        }

                    } else if ($(this).is('input:checkbox')) {
                        if (multy) {
                            $(this).prop('checked', v & $(this).val());
                        } else {
                            $(this).prop('checked', $(this).val() == v);
                        }
                    }
                })
                // отмечаем режим рисования
                pb = $('button.painting.active');
                let ab = false;
                if (rhand.painting == 'clear') {
                    ab = $('button.painting[data-handle=clearpaint]');
                } else if (rhand.painting == 'obstacles' || rhand.painting == 'obstaclesfin') {
                    ab = $('button.painting[data-handle=paint]');
                }
                if (pb.not(ab).length > 0) pb.not(ab).removeClass('active');
                if (ab.length > 0) ab.addClass('active');
                draw();
                return true;
            // break;
            case "tab":
                // открыть таб с номером whattodo[1]
                let that = $(this).addClass('active'),
                    parent = that.parents('.tab').eq(0).parent(),
                    reltab = $('.tabcontent', parent).eq(whattodo[1]).addClass('active');
                $('.tablinks, .tabcontent', parent).not(that).not(reltab).removeClass('active');
                break;

            case 'mapclick':
                let o=whattodo[1];
                if (rhand.painting === 'clear') {
                    let x = rhand.fromscreen([o.offsetX, o.offsetY]);
                    for (let a in rhand.Obstacles) {
                        let o = rhand.Obstacles[a];
                        if (rhand.distP(o[0], o[1], x) < 5) { // нашли первое близкое препятствие
                            rhand.Obstacles.splice(a, 1);
                            break;
                        }
                    }
                    rhand.mapit();
                    rhand.painting = '';
                    draw();
                } else if (rhand.painting === 'obstacles') {
                    let x = rhand.fromscreen([o.offsetX, o.offsetY]);
                    rhand.Obstacles.push([x, x]);
                    rhand.painting = 'obstaclesfin';
                    updatectrl();
                    draw();
                } else if (rhand.painting === 'obstaclesfin') {
                    let x = rhand.fromscreen([o.offsetX, o.offsetY]);
                    if (rhand.Obstacles.length > 0) {
                        let y = rhand.Obstacles.pop();
                        y[1] = x;
                        rhand.Obstacles.push(y);
                    }
                    rhand.painting = '';
                    rhand.mapit();
                    updatectrl();
                    draw();
                } else {
                    let point = rhand.fromscreen([o.offsetX, o.offsetY]);
                    play(rhand.moveTo(point));
                }
                break;

            case 'load':
                rhand.unserialize(localStorage.getItem('rhand'));
                break;
            case 'store':
                localStorage.setItem('rhand', rhand.serialize());
                break;

            case 'calc':
                // расчет маршрута с точки startA
                // до точки finA
                rhand.trace = rhand.buildtrace();
                play(rhand.trace);
                drawTrace();
                break;

            case 'copyjson':
                // so fill a json value
                let sel = $(whattodo[1]), names = whattodo[2], val = {};
                for (let a in names) {
                    if (names.hasOwnProperty(a) && rhand.hasOwnProperty(names[a])) {
                        val[names[a]] = rhand[names[a]];
                    }
                }
                val.note = 'please! use this values in proper ways';
                sel.val(JSON.stringify(val));
                sel[0].select();
                document.execCommand("copy");
                sel.val('');
                break;

            case 'pastejson':
                (function () {
                    let sel = $(whattodo[1]), _rm = false, _dt = false, vsal = {},
                        data = sel.val() || '',
                        names = whattodo[2];
                    if ('' == data) {
                        let clipboardData = handle.event.originalEvent.clipboardData || window.clipboardData;
                        data = clipboardData && clipboardData.getData('Text') || '';
                    }
                    if (data == '') return;
                    vsal = JSON.parse(data);
                    sel.val('');
                    for (let a in names) {
                        if (names.hasOwnProperty(a) && rhand.hasOwnProperty(names[a])) {
                            rhand[names[a]] = vsal[names[a]];
                            if ('trace' == names[a]) _dt = true;
                            if ('Obstacles' == names[a]) _rm = true;
                        }
                    }
                    _rm && rhand.mapit();
                    //updatectrl();
                    _dt && drawTrace();
                    draw();
                })();
                break;

            case 'pastepath':
                (function () {
                    let sel = $(whattodo[1]),
                        data = sel.val() || '';
                    if ('' == data) {
                        let clipboardData = handle.event.originalEvent.clipboardData || window.clipboardData;
                        data = clipboardData && clipboardData.getData('Text') || '';
                    }
                    if (data == '') return;
                    // рисуем
                    let canvas = document.getElementById("canvas");
                    //canvas.setAttribute("height", Math.round(zoom*(maxy-miny)+this.border*2));
                    //canvas.setAttribute("width",Math.round(zoom*(maxx-minx)+this.border*2));
                    let ctx = canvas.getContext("2d");
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = "white";
                    ctx.fillStyle = "white";

                    let p = new Path2D(data);
                    ctx.fill(p);
                })();
                break;
            case 'paint':
                rhand.painting = 'obstacles';
                updatectrl();
                break;
            case 'clearpaint':
                rhand.painting = 'clear';
                updatectrl();
                break;
            case 'mapdragtemp':
                rhand.templine=[whattodo[1],whattodo[2]];
                draw();
                //console.log('mousedragtemp',whattodo[1],whattodo[2]);
                break;
            case 'mapdrag': (function() {
                let a = rhand.fromscreen([rhand.templine[0][0], rhand.templine[0][1]]),
                    b=rhand.fromscreen([rhand.templine[1][0], rhand.templine[1][1]]);
                rhand.templine = false;
                rhand.Obstacles.push([a, b]);
                rhand.mapit();
                updatectrl();
                draw();
                })();
                break;
            case 'resize':
                let bound=$('#map').parents('td')[0].getBoundingClientRect();
                rhand.zoom=Math.min(2,Math.max(0.5,Math.max(rhand.screen[0]/bound.width,
                    rhand.screen[1]/bound.height)));
                let h=Math.min(rhand.screen[1]/rhand.zoom,bound.height),
                    w=Math.min(rhand.screen[0]/rhand.zoom,bound.width);
                $('#canvas')[0].setAttribute("height", h);
                $('#canvas')[0].setAttribute("width",w);
                rhand.screen=[w,h];
                rhand.zoompoint=[
                    w/2,
                    h*2/5
                ]
                rhand.svgcache=[];
                draw();
                break;
        }
        return false; // стандартный результат - прекращение обработки события
    }

    // обычная реакция на клик и изменения контролов
    $(document).on('submit change click paste', '[data-handle]', function (e) {
        let that = $(this);
        if (that.is('select') && e.type !== 'change') return;
        if ($(e.target).is('form') && e.type !== 'submit') return;
        if (that.is('.pressHold')) return;
        // if (e.type !== 'click') return;
        // if (e.type !== 'click') return;
        if (e.type = 'paste') {
            // Stop data actually being pasted into div
            e.stopPropagation();
            e.preventDefault();
        }
        handle.event = e;
        var data = parseData(that.attr('data-handle')), ret = handle.call(this, data);
        handle.event = null;
        return ret;
    });
    // визуализация шагов программы
    let look4keys = false;

    function show(tr) {
        let data = tr.data('data');
        if (data && data.length && data.length>1) {
            rhand.pointA[2] = data[0];
            rhand.pointB[2] = data[1];
            draw();
        }
    }

    $('#programm').on('click', function (e) {
        let x = $('tr.active', this),
            tr = $(e.target).parents('tr').eq(0);
        x.not(tr).removeClass('active');
        tr.addClass('active');
        show(tr);
    });
    $('#programm').hover(function (e) {
        look4keys = true;
    }, function () {
        look4keys = false;
    });
    $(document).on('keydown', function (e) {
        if (look4keys) {
            let move = false;
            if (!!e.originalEvent.key) {
                if (e.originalEvent.key == 'ArrowDown')
                    move = 1;
                else if (e.originalEvent.key == 'ArrowUp')
                    move = -1;
            }
            if (false !== move) {
                let that = $('#programm'), parent = that.parent(), h = $('tr:eq(1)', that).height();
                if (move > 0) {
                    parent.scrollTop(parent.scrollTop() + h);
                } else {
                    parent.scrollTop(parent.scrollTop() - h);
                }
                let x = $('tr.active', that), y;
                if (move > 0) {
                    y = x.next();
                } else {
                    y = x.prev();
                }
                if (y.length > 0) {
                    x.removeClass('active');
                    y.addClass('active');
                    show(y);
                }
            }
            //console.log(e);
            return false;
        } else if ('Escape' == e.originalEvent.key) {
            if( rhand.painting != '')
                rhand.painting = '';
            play.stop=true;
            updatectrl();
        }
        //return false;
    })

    // реакция на pressHold событие. Непрерывная генерация событий
    var timeout = false, interval = false;
    $(document).on('mousedown mouseup mouseleave', '.pressHold[data-handle]', function (e) {
        if (e.type === 'mousedown') {
            var that = this, data = parseData($(this).attr('data-handle'));
            // is it hold ?
            handle.event = e;
            timeout = setTimeout(function () {
                interval = setInterval(function () {
                    handle.call(that, data);
                }, 50);
            }, 300);
            handle.call(that, data);
            handle.event = null;
            updatectrl();
            // генерируем
        } else {
            clearTimeout(timeout);
            clearInterval(interval);
            updatectrl();
            // прекращаем
        }
        return false;
    });
    $(window).resize(function () {
        handle(['resize']);//run on every window resize
    });
    window.addEventListener('beforeunload', function (e) {
        handle(['store']);
        e.preventDefault();
        //e.returnValue = '';
        return true;
    });
    $(window).bind('mousewheel DOMMouseScroll', function(event){
        if($(event.target).is('#canvas')) {
            if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
                // scroll up
                rhand.zoom=Math.max(0.5,rhand.zoom*0.9);
            } else {
                rhand.zoom=Math.min(rhand.zoom/0.9,2);
            }
            rhand.svgcache=[];
            rhand.draw();
            //return false;
        }
    });
    // D&D на канвасе
    let timetostart,to=false,state=0, startpoint=[], lastpoint;
    $(document).on('mousedown mouseup mouseleave','#canvas',function(e){
        // d&d support
        if(e.type=='mousedown') {
            let today = new Date();
            state=1; // pressed
            timetostart = today.getMilliseconds();
            startpoint=[e.offsetX,e.offsetY];
            to=setTimeout(function(){
                state=2; // dragging
                $(document).on('mousemove','#canvas',function(e){
                    lastpoint=[e.offsetX,e.offsetY];
                    handle(['mapdragtemp',startpoint,lastpoint]);
                    return false;
                });
                to=false;
            },200);
        } else {
            // прекращаем
            if(e.type=='mouseup'){
                lastpoint=[e.offsetX,e.offsetY];
            }
            $(document).off('mousemove','#canvas');
            if(to){
                clearTimeout(to);
                to=false;
            }
            if(state==2)
                handle(['mapdrag',startpoint,[e.offsetX,e.offsetY]]);
            else if(state==1) {
                handle(['mapclick',{offsetX:e.offsetX,offsetY:e.offsetY}]);
            }

            state=0;
            return false;
        }
    })

    rhand.init();
    handle([['load'],['resize']]);
    window.rhand.mapit();
    draw();
    drawTrace();
})