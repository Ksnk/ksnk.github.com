// **********************************************************************
// **  ������� ���������� ������� �� aengine.js
// **********************************************************************

// ������� - ��������
helicopter = newClass(a_item,{
    name:'��������',
	speed :{x:0,y:0},
    img:'images/b2.gif',
    mass:3,
    waittill:0, // ������� �������� �������
    self_act: function (e) {
		if (this.waittill>0) this.waittill--;
		else if(this.speed) { // ��������� �������
			this.speed.x=Math.random()*8-4;
			this.speed.y=Math.random()*8-4;
			this.waittill=Math.floor(50+Math.random()*100) ; // 2.5-7 ������
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
// ��������� �� ����
stinger = newClass(a_item,{
	speed :{x:0,y:0},
    img:'images/pulya03.gif', //'images/pulya12.gif'
    img2:'images/09.gif',
    mass:1,
    visibility:'hidden',
    waittill:0, // ������� �������� �������
    state:0, // �����-��������� - 1 ���������� - 2 �������� 0
    self_act: function (e) {
		if (this.waittill>0) this.waittill--;
		else switch(this.state){ // ��������� �������
			case 0: //���������� � ���� � ��������
			    with(this.pos){x=0;y=0}
			    with(this.speed){x=0;y=0}
				this.state=1; // ������� ������ ������
				this.waittill=400; // 20 ������ ������� ��������
				break;
			case 1: //�� �������� - ����������.
				this.makeboom(); break ;
			case 2:	// ���� � ���� ������
				this.pos.x=-1000;this.pos.y=-1000; this.state=0;
		    	with (preloads[this.img]) {
					this.elm.src=src;
					this.elm.style.width=width+'px';
					this.elm.style.height=height+'px';
				}
				this.waittill=60; // 3 ���
				break;
		}
    },

    makeboom: function () {
    	with (preloads[this.img2]) {
			this.elm.src=src;
			this.elm.style.width=width+'px';
			this.elm.style.height=height+'px';
		}

		this.waittill=30 ; this.state=2
    },

    act: function(item) {
    	if (this.state!=1) return {x:0,y:0};
        if (!item.pos) return null;
        var dx=this.pos.x-item.pos.x,
        	dy=this.pos.y-item.pos.y;
		var disp=Math.sqrt(dx*dx+dy*dy);
		if (disp<5) this.makeboom();
		else k=0.9/disp  ;
		return {x:dx*k,y:dy*k};   // ��������� ����� �� ����, ��� ����������
    },

	draw: function(w,s) {
		if (this.outof(w,s)==0)
		{
	        this.constructor.prototype.draw.call(this,w,s);
			if (this.elm.style.visibility!= 'visible')
		    	this.elm.style.visibility='visible'
		}else{
			if (this.elm.style.visibility!= 'hidden') {
		    	this.elm.style.visibility='hidden';
		        this.constructor.prototype.draw.call(this,w,s);
	        }
		}
	}
});

/** ����� ����������� �����, � ���������� �� "�������������� �����" */
stinger1 = newClass(stinger,{
    img:'images/pulya12.gif', //'images/pulya12.gif'

    act: function(item) {
        if (this.state!=1) return {x:0,y:0};
        if (!item.pos) return null;
        var dx=this.pos.x-item.pos.x,
            dy=this.pos.y-item.pos.y;
        var disp=Math.sqrt(dx*dx+dy*dy),k=0; // ���������� �� ����.
        if (disp<5) this.makeboom();
        else {
            // �������� ����� - �
            var t=disp/8,
                ddx=item.pos.x+item.speed.x* t,
                ddy=item.pos.y+item.speed.y* t; // ddx,ddy - ����� ���������� ����
            dx=this.pos.x-ddx;
            dy=this.pos.y-ddy;
            disp=Math.sqrt(dx*dx+dy*dy); // ���������� �� �������������� �����.
           // debug(item.pos,item.speed,ddx,ddy,dx,dy,disp, t,'-----');
            k=0.9/disp  ; // k - ��������
        }
        return {x:dx*k,y:dy*k};   // ��������� ����� �� ����, ��� ����������
    }

});
