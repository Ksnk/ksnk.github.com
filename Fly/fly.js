/*@cc_on @*/
(function () {

    /**
     * выдать случайный элемент
     * @param arr
     */
    function random(arr) {
        if (arr instanceof Array)
            return arr[Math.floor(Math.random() * arr.length)];
        else
            return arr;
    }

    /**
     *   current mouse coordinates
     */
    var engine, cursor = {x: -1, y: 0}, past = {x: 0, y: 0}; //
    /**
     *  the fly object. Handle upload fly image and handle moving and events
     *  - fly can be staing in one of states
     *  -- moving diretly with some speed and direction
     *  -- staing (it's some sort of moving)
     *  -- been hidden
     *
     *  Every state continues awhile time in out. after timeout state is changed and fly setting in the ovet state
     *  Every state can be broken by event. The rules to rule a  single fly
     *
     *  default:{mintime:3000,maxtime:10000,speed:20,
     *          _timeout:['walk','stay','fly'],
     *          _impact:'fly',
     *          _mousemove:'stay',
     *          _mouseover:'hidden'}
     *
     *  rules:{
     *      'walk':{cadr:[1,2,3,4,5]}
     *      'stay':{cadr:[6,7,8]}
     *      'fly':{cadr:[9,10]}
     *      'hidden': {}
     *  }
     *
     */
    function the_fly(param) {
        /**
         * time to live in this state.
         */
        this._cnt = 1;
        /**
         * fly state
         */
        this.state = 'hidden';
        /**
         * top-left corner of the canvas
         */
        this.coord = {
            x: Math.random() * engine.window.x + engine.scroll.x,
            y: Math.random() * engine.window.y + engine.scroll.y
        };
        /**
         * fly speed
         */
        this.speed = 0;
        /**
         * fly angle
         */
        this.angle = 0;

        this._default = {
            mintime: 1000, maxtime: 5000, speed: 20,
            _timeout: ['walk', 'stay', 'fly'],
            _impact: 'fly',
            _mousemove: 'stay',
            _mouseover: 'hidden'
        };

        this.rules = {
            'walk': {cadr: [1, 2, 3, 4, 5]},
            'stay': {cadr: [6, 7, 8]},
            'fly': {cadr: [9, 10]},
            'hidden': {}
        };

        /**
         * update new object with parameters
         */
        if (param) for (a in param) {
            this[a] = param[a];
        }

        for (var i in this.rules)
            for (var j in this._default) {
                if (!this.rules[i][j]) this.rules[i][j] = this._default[j];
            }
        delete (this._default);
        /**
         * canvas element
         */
        fly = document.createElement('canvas');
        fly.className = 'fly';
        fly.setAttribute('width', this.obj.width);
        fly.setAttribute('height', this.obj.height);
        this.element = document.body.appendChild(fly);
        /*@if (@_jscript_version >= 1)
            G_vmlCanvasManager.initElement(this.element);
        @end @*/

        /**
         * intaerface function - done all work
         */
        this.done = function () {
            /**
             * just to clear something any case
             */
            this.element = null;
        };
        /**
         * current frame to show in canvas
         */
        this.kadr = 0;
        /**
         * distance from object to cursor
         */
        this.dist = function (cursor) {
            var dx = cursor.x - this.obj.width / 2 - this.coord.x,
                dy = -cursor.y + this.coord.y + this.obj.height / 2;
            return Math.sqrt(dx * dx + dy * dy);
        };

        /**
         * let fly to look at cursor
         */
        this.lookat = function (cursor) {
            var angle = 0;
            if (cursor.x != -1) {
                var dx = cursor.x - (this.obj.width / 2) - this.coord.x,
                    dy = -cursor.y + this.coord.y + this.obj.height / 2;
                var dd = Math.sqrt(dx * dx + dy * dy);
                if (dd > 0.001) { // защита от деления на ноль
                    angle = Math.acos(dx / dd);
                    if (dy < 0) angle = -angle;
                }
            }
            return angle;
        };

        /**
         * just follow rules
         * do next step, if you need to forcely change the state - call him with parameter
         */
        this.nextstep = function (state, event) {
            // random select next step from rules
            var rule = this.rules[this.state || 'hidden'];
            if (!rule[event] || rule[event].length == 0) return false;


            // change state
            this.state = random(rule[event || '_timeout']);
            rule = this.rules[this.state || 'hidden'];
            if (rule.kadr) {
                this.kadrnum = Math.floor(Math.random() * rule.kadr.length);
                // console.log(this.kadrnum,rule.kadr)
            }
            this.speed = rule.speed || 0;
            this._cnt = Math.round(rule.mintime + Math.random(rule.maxtime - rule.mintime));
            if (rule.init) rule.init.call(this);
            return true;
        };

        function drawKadr(ctx, _img, kadr) {
            ctx.save();
            ctx.translate(this.obj.width / 2, this.obj.height / 2);
            if (kadr >= 0)
                ctx.rotate((Math.PI / 2) - this.angle);
            else
                kadr = -kadr;
            ctx.drawImage(_img
                , 0, kadr * this.obj.fFheight, this.obj.fwidth, this.obj.fheight
                , this.obj._x, this.obj._y, this.obj.fwidth, this.obj.fheight);
            ctx.restore();
        }

        /**
         * to draw a fly
         */
        this.draw = function () {
            var rule = this.rules[this.state];
            /**
             * if flie is too close with cursor - fly away
             */
            if (!(60 > this.dist(cursor) && this.nextstep(1, '_impact')))
                if (!((past.x != cursor.x || past.y != cursor.y) && this.nextstep(1, '_mousemove')))
                    if (!(this._cnt-- <= 0 && this.nextstep(1, '_timeout'))) {
                        if (rule.every) rule.every.call(this);
                        if (rule.speed > 0) {
                            this.coord.x += Math.cos(this.angle) * this.speed;
                            this.coord.y -= Math.sin(this.angle) * this.speed;
                        }
                        if (typeof (rule.angle) == 'function') {
                            this.angle = rule.angle.call(this, this.cursor);
                        }
                        if (rule.kadr) {
                            this.kadr = rule.kadr[this.kadrnum] || 0;
                            if (++this.kadrnum >= rule.kadr.length) this.kadrnum = 0;
                        }
                    }

            if (this.element && this.element.getContext) {
                if (!(this.coord.x < engine.scroll.x - this.obj.width / 2
                    || this.coord.x > -this.obj.width + window.scrollWidth + engine.scroll.x
                    || this.coord.y < engine.scroll.x - this.obj.height / 2
                    || this.coord.y > -this.obj.height + engine.window.y + engine.scroll.y
                )) {
                    if (this.element.style.display != 'block') this.element.style.display = 'block';
                    this.element.style.top = this.coord.y + 'px';
                    this.element.style.left = this.coord.x + 'px';

                    var ctx = this.element.getContext('2d');
                    ctx.fillStyle = "rgba(255,255,255,0)";
                    ctx.clearRect(-this.obj.width, -this.obj.height, 2 * this.obj.width, 2 * this.obj.height);
                    ctx.lineWidth = 1.0;
                    var _img = document.getElementById(this.obj.fid);
                    try {
                        if (typeof (_img.complete) == 'undefined' || _img.complete) {
                            if (this.kadr instanceof Array) {
                                for (var i = 0; i < this.kadr.length; i++) {
                                    drawKadr.call(this, ctx, _img, this.kadr[i]);
                                }
                            } else {
                                drawKadr.call(this, ctx, _img, this.kadr);
                            }
                        }
                    } catch (e) {
                        //engine.debug('1'+e.toString());
                    }
                } else {
                    if (this.element.style.display != 'none') this.element.style.display = 'none';
                }

            }
        }
    }

    /**
     * just an engine
     */
    engine = {
        /**
         * dirty and fast window screen calculation
         */
        scroll: {x: 0, y: 0},
        calc_Bounds: function () {
            //  var padd = 20; // donow truly, but it's work :) mb possible scroller size?
            engine.window = {
                x: document.compatMode == 'CSS1Compat' && !window.opera ? document.documentElement.clientWidth : document.body.clientWidth,
                y: document.compatMode == 'CSS1Compat' && !window.opera ? document.documentElement.clientHeight : document.body.clientHeight
            };

            //Размер документа по горизонтали
            engine.scroll = {
                x: (document.documentElement && document.documentElement.scrollLeft)
                    || (document.body && document.body.scrollLeft),
                y: (document.documentElement && document.documentElement.scrollTop) || (document.body && document.body.scrollTop)
            };
        },

        /**
         *  here is a self-made event handling
         */
        _handlers: {},
        _curhandle: '0',
        set: function (x) {
            if (!x) x = '0';
            this._curhandle = x;
            return this;
        },
        $: function (id) {
            return (typeof id == 'string') ? document.getElementById(id) : id;
        },
        add_event: function (a, e, o, c, d) {
            if (!a) return this;
            if (e instanceof Array) {
                for (var i in e)
                    this.add_event(a, e[i], o);
                return this;
            }
            if (!o) o = this[e];
            if (!o) return null;
            var fn = o;
            if (!fn.__binded) {
                fn = function (e) {
                    return o.call(a, e || window.event, c, d);
                };
            }
            fn.__binded = true;
            if (a.addEventListener)
                a.addEventListener(e, fn, false);
            else if (a.attachEvent) {
                try {
                    a.attachEvent(e = 'on' + e, fn);
                } catch (aEx) {
                }
            }
            var ind = this._curhandle, h = this._handlers;
            if (!h[ind]) h[ind] = [];
            h[ind].push({a: a, e: e, o: fn});
            return this;
        },
        /**
         *
         */
        clear_events: function (ind) {
            var h, o, hh = this._handlers[ind || 0];
            if (hh) {
                while (h = hh.pop()) {
                    if (h.a.removeEventListener) {
                        h.a.removeEventListener(h.e, h.o, false);
                    } else if (o = h.a.detachEvent) {
                        try {
                            o( /*'on'   */ h.e, h.o);
                        } catch (aEx) {
                        }
                    }
                }
            }
            return this;
        },
        /**
         *
         */
        mousetgt: (window.execScript || window.opera) ? document : window,

        /**
         *
         */
        clearEv: function (e) {
            if (e.preventDefault) e.preventDefault();
            e.cancelBubble = true;
            if (e.stopPropagation) e.stopPropagation();
            return (e.returnValue = false);
        },

        /**
         * debuger function
         */

        debug: function () {
        },

        /**
         * append script with callback
         */
        appendScript: function (src, callback) {
            var scriptElem = document.createElement('script');
            scriptElem.setAttribute('type', 'text/javascript');
            if (callback) {
                scriptElem.onload = function () {
                    scriptElem.onreadystatechange = null;
                    scriptElem.onload = null;
                    callback();
                };
                scriptElem.onreadystatechange = function () {
                    if ('loaded' == this.readyState) {
                        scriptElem.onload();
                    }
                }
            }
            scriptElem.setAttribute('src', src);
            document.getElementsByTagName('head')[0].appendChild(scriptElem);
        },
        /**
         * append multyline CSS text into CSS rules store
         */
        appendCSSRules: function (text) {
            /*@if (@_jscript_version >= 1)
            var cssreg=/([^{]+){([^}]+)}/g, res;
            while (res=cssreg.exec(text)) {
                document.styleSheets[0].addRule(res[1].replace(/^\s+|\s+$/g,''),res[2].replace(/^\s+|\s+$/g,''));
            }
            @else @*/
            var style = document.createElement('style');
            style.type = 'text/css';
            if (style.styleSheet) {
                style.styleSheet.cssText = ' ' + text;
            } else if (style.innerText == '') {
                style.innerText = text;
            } else {
                style.innerHTML = text;
            }
            document.getElementsByTagName('head')[0].appendChild(style);
            /*@end @*/
        },
        //

        objects: [],
        add: function (elem) {
            this.objects.push(elem);
        },
        init_fly: function (fly) {
            for (var i in fly) {
                if (!fly[i]) continue;
                var cnt = fly[i] && fly[i].cnt || 3;
                while (cnt--) {
                    this.add(new the_fly(fly[i]));
                }
            }
        },
        init: function (flies) {
            let init_func = function () {
                /*@if (@_jscript_version >= 1)
                engine.appendScript('http://ksnk.github.com/Fly/excanvas-modified.min.js',function(){engine.excanvas_complete=true;});
                /*@end @*/
                engine.appendCSSRules("#fly_prepare { position:absolute; visibility:hidden; top:0; left:0; } #debug {color:red; position:fixed; top:0; left:0;} .fly { position: absolute; top:0; left:0px; z-index:1000; }");
                var fly = document.createElement("div");
                fly.setAttribute("id", "fly_prepare");
                fly.innerHTML = '<img class="fly_src" id="cow_01" src="https://ksnk.github.io/Fly/cow.png">';
                document.body.appendChild(fly);
                /*@if (@_jscript_version >= 1)
                    function xxx(){
                      if(engine.excanvas_complete && G_vmlCanvasManager){
                        if (!document.namespaces || !document.namespaces['g_vml_']){
                            G_vmlCanvasManager.init_(document);
                        }
                        engine.calc_Bounds();
                        engine.init_fly(flies);
                      }
                      else
                        setTimeout(xxx,100);
                    }
                    setTimeout(xxx,100);
                @else @*/
                setTimeout(function () {
                    engine.calc_Bounds();
                    engine.init_fly(flies)
                }, 100);
                /*@end @*/
                engine.draw()
            };
            if (document.readyState == 'complete') {
                init_func();
            } else {
                this.add_event(window, "load", init_func);
            }

            this.add_event(window, 'unload');
            this.add_event(this.mousetgt, 'mousemove',
                function (e) {
                    cursor.x = e.clientX + (engine.scroll.x || 0);
                    cursor.y = e.clientY + (engine.scroll.y || 0);
                });
            this.add_event(window, 'resize', this.calc_Bounds);
            this.add_event(window, 'scroll', this.calc_Bounds);

            this._drawto = setInterval(this.draw, 50);
        },
        /**
         * unload function - call all done destructors and cleanup event handlers
         */
        unload: function () {
            if (engine._drawto) clearInterval(engine._drawto);
            if (engine.objects)
                for (var i = 0; i < engine.objects.length; i++) {
                    engine.objects[i].done();
                    engine.objects[i] = null;
                }
            for (var i in engine._handlers)
                engine.clear_events(i);
        },
        /**
         * united draw funtion
         */
        draw: function () {
            for (var i = 0; i < engine.objects.length; i++) {
                engine.objects[i].draw();
            }
            past = {x: cursor.x, y: cursor.y};

        }
    };
    engine.init([{
        name: 'cow',
        cnt: 2,
        obj: {
            fid: 'cow_01', width: 87, height: 87,
            fwidth: 70, fheight: 51, fFheight: 50,
            _x: -35, _y: -25.5
        },

        _default: {},

        rules: {
            walk: {
                _mousemove: 'stay',
                _timeout: ['walk', 'walk', 'stay'],
                _impact: 'flydown',
                mintime: 30,
                maxtime: 60,
                speed: 4,
                kadr: [[3, -2, 1], [4, -2, 1], [5, -2, 1], [4, -2, 1]],
                init: function () {
                    this.angle = this.lookat({
                        x: Math.random() * engine.window.x + engine.scroll.x
                        , y: Math.random() * engine.window.y + engine.scroll.y
                    });
                }
            },
            flydown: {
                _timeout: ['walk', 'stay', 'stay', 'stay', 'fly'],
                speed: 80,
                kadr: [[-2, -1]], mintime: 6, maxtime: 10, init: function () {
                    this.angle = 3 / 2 * Math.PI;
                }
            },
            walkaway: {
                _timeout: ['walk', 'stay', 'stay', 'stay', 'fly'],
                _impact: 'flydown',
                speed: 4,
                kadr: [[3, -2, 1], [4, -2, 1], [5, -2, 1], [4, -2, 1]],
                mintime: 20, maxtime: 40,
                every: function () {
                    this.angle = Math.PI + this.lookat(cursor)
                }
            },
            stay: {
                _mousemove: 'walkaway',
                _timeout: ['walk', 'stay', 'stay', 'stay', 'fly'],
                _impact: 'flydown',
                kadr: [[6, -2, 1]], mintime: 20, maxtime: 40,
                every: function () {
                    this.angle = this.lookat(cursor)
                }
            },
            fly: {
                mintime: 20, maxtime: 40,
                _timeout: ['stay', 'fly'],
                speed: 30, kadr: [0], init: function () {
                    this.angle = this.lookat({
                        x: Math.random() * engine.window.x + engine.scroll.x
                        , y: Math.random() * engine.window.y + engine.scroll.y
                    });
                }
            },
            hidden: {_timeout: ['fly']}
        }
    },

        null]);
})()