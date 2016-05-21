// **********************************************************************
// **  простое применение классов из aengine.js
// **********************************************************************

// элемент - вертолет
helicopter = newClass(a_item,{
    name:'вертолет',
	speed :{x:0,y:0},
    img:'images/b2.gif',
    mass:3,
    waittill:0, // счетчик принятия решения
    self_act: function (e) {
		if (this.waittill>0) this.waittill--;
		else if(this.speed) { // принимаем решение
			this.speed.x=Math.random()*8-4;
			this.speed.y=Math.random()*8-4;
			this.waittill=Math.floor(50+Math.random()*100) ; // 2.5-7 секунд
		}
    },
	draw: function(w,s) {
		switch(this.outof(w,s)) {
			case 3: this.pos.x=w.x-this.ww.x;break;
			case 4: this.pos.x=s.x+this.ww.x;break;
			case 1: this.pos.y=w.y-this.ww.y;break;
			case 2: this.pos.y=s.y+this.ww.y;break;
		}
		this.constructor.prototype.draw.call(this,w,s);
	}
});

helicopter1 = newClass(helicopter,{
    name:'вертолет1',
    post_act: function () {
        this.speed.x=-2;this.speed.y=0.1;
    },
    self_act: function (e) {}
});

// наводится на цель
stinger = newClass(a_item,{
	speed :{x:0,y:0},
    img:'images/pulya03.gif', //'images/pulya12.gif'
    img2:'images/09.gif',
    mass:1,
    visibility:'hidden',
    waittill:120, // счетчик принятия решения - пусть цель разгонится
    state:0, // летим-наводимся - 1 взрываемся - 2 отдыхаем 0

    calc_vector:function(e){
        if (this.state!=1) return {x:0,y:0};
        if (!this.goal) return null;
        if(this.speed){
            this.norm(this.speed,2.5);
        }
        var dx=this.goal.pos.x-this.pos.x,
            dy=this.goal.pos.y-this.pos.y;
        var disp=Math.sqrt(dx*dx+dy*dy);
        if (disp<5) this.makeboom();
        else k=0.2/disp  ;
       // this.speed=this.norm({x:dx,y:dy},2.5);
        e.x=dx*k;e.y=dy*k;   // наводимся точно на цель, без упреждения
    },
    self_act: function (e) {
        if(this.state==1)this.calc_vector(e);
		if (this.waittill>0) this.waittill--;
		else switch(this.state){ // принимаем решение
			case 0: //становимся в позу и полетели
			    with(this.pos){x=400;y=0}
			    with(this.speed){x=0;y=0}
				this.state=1; // взводим таймер взрыва
				this.waittill=400; // 20 секунд резерва горючего
                this.calc_vector(e);
				break;
			case 1: //не долетели - взрываемся.
				this.makeboom(); break ;
			case 2:	// ждем у моря погоды
				this.pos.x=-1000;this.pos.y=-1000; this.state=0;
		    	with (preloads[this.img]) {
					this.elm.src=src;
					this.elm.style.width=width+'px';
					this.elm.style.height=height+'px';
				}
				this.waittill=60; // 3 сек
				break;
		}
    },

    makeboom: function () {
    	with (preloads[this.img2]) {
			this.elm.src=src;
			this.elm.style.width=width+'px';
			this.elm.style.height=height+'px';
            this.speed={x:0,y:0};
		}

		this.waittill=30 ; this.state=2
    },


	draw: function(w,s) {
		if (this.outof(w,s)==0)
		{
	        this.constructor.prototype.draw.call(this,w,s);
			if (this.elm.style.visibility!= 'visible')
		    	this.elm.style.visibility='visible'
		} else {
			if (this.elm.style.visibility!= 'hidden') {
		    	this.elm.style.visibility='hidden';
		        this.constructor.prototype.draw.call(this,w,s);
	        }
		}
	}
});

bullet = newClass(stinger,{
    speed :{x:0,y:0},
    name:'пуля',
    baseSpeed:4, // скорость движения
    img:'images/pulya12.gif', //'images/pulya12.gif'
    pos:{x:0,y:0},
    post_act:function(){

        if(this.state==1){
            if (this.dist(this.diff(this.goal.pos,this.pos))<5) {
                this.makeboom();return;
            }
        }
        if (this.waittill>0) this.waittill--;
        else {
            switch(this.state){ // принимаем решение
                case 0: //становимся в позу и полетели
                    this.pos.x=this.posX&&this.posX.x||0;
                    this.pos.y=this.posX&&this.posX.y||0;
                    this.speed.x=0;this.speed.y=0;
                    this.state=1; // взводим таймер взрыва
                    this.waittill=400; // 20 секунд резерва горючего
                    // прицеливаемся
                    if (!this.goal) return null;
                    var gamma=this.torad(this.diff(this.goal.pos,this.pos)),
                        alpha=this.torad(this.goal.speed),
                        gs=this.dist(this.goal.speed),
                        sin_betta=Math.sin(Math.PI-alpha+gamma)*gs/this.baseSpeed;
                    if(sin_betta>1||sin_betta<-1){
                        this.waittill=30 ; this.state=2; return;
                    }
                    var beta=Math.asin(sin_betta);
                    this.speed.x=this.baseSpeed*Math.cos(gamma+beta);
                    this.speed.y=this.baseSpeed*Math.sin(gamma+beta);
                    break;
                case 1: //не долетели - взрываемся.
                    this.makeboom(); break ;
                case 2:	// ждем у моря погоды
                    this.pos.x=-1000;this.pos.y=-1000; this.state=0;
                    with (preloads[this.img]) {
                        this.elm.src=src;
                        this.elm.style.width=width+'px';
                        this.elm.style.height=height+'px';
                    }
                    this.waittill=60; // 3 сек
                    break;
            }
        }
    },
    self_act: function (e) {}

});
