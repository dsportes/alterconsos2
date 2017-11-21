$(document).ready(function(event) {
	APP = AC.Root;
	if (!APP.started) {
		// AC.dbg = true;
		// AC.logLevel = 2;
		if (navigator.appVersion.indexOf("MSIE") != -1)
			AC.dbg = false;
		APP.started = true;
		APP.run();
	};
});

AC = {
	TEST : false,
	
	// constantes globales
	NONE : -1,
	ERROR : 0,
	INFO : 1,
	DEBUG : 2,
	logLevel : 2,
	dbg : false,
	attente: 0, // 4000,
	erreur: 0, // 12,
	
	log : function(logLevel, msg){
		if (AC.dbg && AC.logLevel >= logLevel && msg) {
			console.log(new Date().stdFormat() + " - " + msg);
		}
	},
	
	encodeParam : function (obj) {
		if (!obj)
			obj = {};
		var s = JSON.stringify(obj);
		return " data-param=\'" + s + "' ";
	},
	
	decodeParam : function(target){
		var param = target.attr("data-param");
		return param ? JSON.parse(param) : {};
	},

	error : function(msg) {this.log(AC.ERROR, msg);},
	info : function(msg) {this.log(AC.INFO, msg);},
	debug : function(msg) {this.log(AC.DEBUG, msg);},
	
	assert : function(condition, message) {
	    if (!condition) throw message || "Assertion failed";
	},

	declare : function(child, parent, proto1) {
		if (parent) {
			child.prototype = Object.create(parent.prototype);
			child.prototype.constructor = child;
		}
		var proto = child["_proto"];
		if (proto)
			for(var fn in proto){
				if(proto.hasOwnProperty(fn))
					child.prototype[fn] = proto[fn];
			}
		var statics = child["_static"];
		if (statics)
			for(var fn in statics){
				if(statics.hasOwnProperty(fn))
					child[fn] = statics[fn];
			}
		if (arguments.length > 2){
			for(var i = 2, p = null; p = arguments[i]; i++){
				for(var fn in p){
					if(p.hasOwnProperty(fn))
						child.prototype[fn] = p[fn];
				}				
			}
		}
	},
	
	local : function(key, val){
		if (val == undefined || val == null) {
			try {
				return localStorage.getItem("AC" + key);
			} catch(e){
				return null;
			}
		} else {
			try {
				localStorage.setItem("AC" + key, "" + val);
			} catch(e){}			
		}
	},

	oncl : function(caller, id, cb, arg){
		if (id == null || caller == null || cb == null)
			return;
		var idx = typeof id == "string" ? $("#" + id) : id;
		idx.off("click").on("click", {cb:cb, caller:caller, arg:arg}, function(event){
			event.stopPropagation();
			event.data.cb.call(event.data.caller, $(event.currentTarget), event.data.arg);
		});			
	}
	
};

/***********************************************************/
AC.AutoSync = {
	autoSync : true,

	showSubView : function(subView){
		if (subView){
			if (!this.subViews)
				this.subViews = [];
			this.subViews.push(subView);
		}
	},

	hideSubView : function(subView){
		if (this.subViews && subView) {
			var i = this.subViews.indexOf(subView);
			if (i != -1)
				this.subViews.splice(i, 1);
		}
		if (this.onScreenClose)
			this.onScreenClose(subView);
	},

	watch : function(cell){
		if (!cell)
			return;
		if (!this.watchedCells)
			this.watchedCells = [];
		var w = this.watchedCells;
		if (w.indexOf(cell) == -1) {
			w.push(cell);
			if (cell.className == "Calendrier")
				AC.Calendrier.attach(this);
			else if (cell.className == "Directory")
				AC.Directory.attach(this);
			else
				cell.attach(this);
		}
	},
	
	start : function(){
		this.started = 1;
		this.compile();
		if (!this.resyncIfNeeded()) {
			this.display();
			if (this.subViews)
				for (var i = 0, subView = null; subView = this.subViews[i]; i++) {
					if (subView.display)
						subView.display();
				}
		}
	},

	resyncIfNeeded : function(){
		if (AC.Cell.hasNeverSynchedCells()){
			AC.Req.sync(this, this.start)
			return true;
		} else
			return false;
	},
	
	pause : function(){
		if (this.started == 1)
			this.started = 2;
	},
	
	stop : function(){
		this.started = 0;
		if (this.watchedCells){
			for (var i = 0, cell = null; cell = this.watchedCells[i]; i++) {
				if (cell.className == "Calendrier")
					AC.Calendrier.detach(this);
				else if (cell.className == "Directory")
					AC.Directory.detach(this);
				else
					cell.detach(this);
			}
		}
	},
	
	onCellsChange : function(){
		if (this.started == 1)
			this.start();
	}
}

/*****************************************************/
function StringBuffer() { this.buffer = []; }
StringBuffer.prototype.append = function append(string) { this.buffer.push(string); return this; };
StringBuffer.prototype.toString = function toString() { return this.buffer.join(""); };
StringBuffer.prototype.join = function join(arg) { return this.buffer.join(arg); };
StringBuffer.prototype.isEmpty = function isEmpty() { return this.buffer.length != 0; };
StringBuffer.prototype.clear = function clear() { this.buffer = []; };

/*****************************************************/
AC.Table = function(nbcol, bicolore, nolabel, sizes){
	this.sb = new StringBuffer();
	this.nc = nbcol < 1 ? 1 : (nbcol > 15 ? 15 : nbcol);
	this.cl = []
	if (!nolabel) {
		var s = sizes && sizes[0] ? "s" : "";
		this.cl.push("<div class='Col1" + s);
		for(var i = 1; i < this.nc; i++) {
			var s = sizes && sizes[i] ? "" + sizes[i] : "";
			this.cl.push("<div class='Col" + s);
		}
	} else {
		for(var i = 0; i < this.nc - 1; i++) {
			var s = sizes && sizes[i] ? "" + sizes[i] : "";
			this.cl.push("<div class='Col" + s);
		}
		this.nc--;
	}
	var s = sizes && sizes[this.nc] ? "" + sizes[this.nc] : "";
	this.cl.push("<div class='Col" + s + " Col9");
	this.bicolore = bicolore;
	this.n = 0;
}
AC.Table._proto = {
	clazz : function(c){
		this.clx = c;
		return this;
	},
	
	space : function(){
		this.sb.append("<div class='Row'>");
		for(var i = 0; i <= this.nc; i++)
			this.sb.append("<div class='ColSP'>&nbsp;</div>");
		this.sb.append("</div>");
	},
	
	row : function(){
		if (this.clx){
			this.sb.append("<div class='Row " + this.clx + "'>");
			this.clx = "";			
		} else {
			if (this.n % 2)
				this.sb.append("<div class='Row2'>");
			else
				this.sb.append("<div class='Row'>");
		}
		for(var i = 0; i <= this.nc; i++){
			var arg = i < arguments.length ? arguments[i] : "";
			if (!arg)
				arg = "&nbsp;";
			this.sb.append(this.cl[i]);
			if (!this.n)
				this.sb.append(" Row1");
			this.sb.append(" ncol_" + (i % 2) + "'>");
			this.sb.append(arg);
			this.sb.append("</div>");
		}
		this.sb.append("</div>");
		this.n++;
	},
	
	flush : function(){
		var s = this.sb.toString();
		this.sb.clear();
		return s;
	}
}
AC.declare(AC.Table);

/** ************************************************* */
AC.Timer = function(caller, delai, args, fnDiff){
	if (!caller || !fnDiff)
		return;
	if (delai && delai < 0) {
		this.periode =  -delai;
		delai = -delai;
	}
	this.caller = caller;
	this.args = args;
	this.fnDiff = fnDiff;
	this.nb = 0;
	var self = this;
	this.timer = setTimeout(function() { self.retour(); }, delai);
}
AC.Timer._proto = {
	className : "Timer",
	
	retour : function(){
		if (this.timer == null)
			return;
		this.fnDiff.call(this.caller, this.args);
		if (this.periode) {
			var self = this;
			this.timer = setTimeout(function() { self.retour(); }, this.periode);
		} else
			this.timer = null;
	},
	
	cancel : function(){
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}
	
}
AC.declare(AC.Timer);

/** ************************************************* */
AC.Flag = {
	QMAX : 1,			// 0
	FRUSTRATION : 2,	// 1
	PAQUETSAC : 4,		// 2
	PARITE : 8,			// 3
	DISTRIB : 16,		// 4
	EXCESTR : 32,		// 5
	PERTETR : 64,		// 6
	PAQUETSC : 128,		// 7
	PAQUETSD : 256,		// 8
	NONCHARGE : 512,	// 9
	
	/*
	ALL: AC.Flag.QMAX | AC.Flag.FRUSTRATION | AC.Flag.PAQUETSAC | AC.Flag.PARITE | AC.Flag.DISTRIB 
		| AC.Flag.EXCESTR | AC.Flag.PERTETR | AC.Flag.PAQUETSC | AC.Flag.PAQUETSD | AC.Flag.NONCHARGE, 
	*/
	// AC.Flag pas encore rempli par _static !!!
	ALL : 1023,
	
	icons : {1:"fl0", 2:"fl1", 4:"fl3", 8:"fl2", 16:"fl7",
		32:"fl4", 64:"fl5", 128:"fl9", 256:"fl8", 512:"fl6"},
		
	// iconFlags : [0, 1, 3, 2, 7, 4, 5, 3, 3, 6],
	
	list : [1,2,4,8,16,32,64,128,256,512],
	
	flagLabels : 
		[[
       "La quantité souhaitée est au dessus du seuil d'alerte déclaré pour ce produit",
       "La quantité attribuée est inférieure à celle saisie par l'alterconso",
       "Le nombre de paquets mis dans le panier ne correspond pas à la quantité attribuée",
       "La quantité totale de ce produit que peut commander un groupe doit être un nombre entier",
       "La quantité déclarée livrée / reçue ne correspond pas à la somme des quantités attribuées",
       "La quantité déclarée reçue (ou le poids total à 5% près) est supérieure à celle déclarée livrée",
       "La quantité déclarée reçue  (ou le poids total à 5% près) est inférieure à celle déclarée livrée",
       "La quantité déclarée livrée (ou le poids total à 5% près) ne correspond pas au nombre de paquets listés livrés",
       "La quantité déclarée reçue (ou le poids total à 5% près) ne correspond pas au nombre de paquets listés reçus",
       "Le produit n'a été déclaré, ni livré, ni reçu"
       ],[
       "Sur au moins une ligne de commande, la quantité souhaitée est au dessus du seuil d'alerte déclaré pour ce produit",
       "Sur au moins une ligne de commande, la quantité attribuée est inférieure à celle saisie par l'alterconso",
       "Sur au moins une ligne de commande, le nombre de paquets mis dans le panier ne correspond pas à la quantité attribuée",
       "La quantité totale de ce produit que peut commander un groupe doit être un nombre entier",
       "La quantité livrée / reçue ne correspond pas à la somme des quantités attribuées",
       "La quantité déclarée reçue (ou le poids total à 5% près) est supérieure à celle déclarée livrée",
       "La quantité déclarée reçue (ou le poids total à 5% près) est inférieure à celle déclarée livrée",
       "La quantité déclarée livrée (ou le poids total à 5% près) ne correspond pas au nombre de paquets listés livrés",
       "La quantité déclarée reçue (ou le poids total à 5% près) ne correspond pas au nombre de paquets listés reçus",
       "Le produit n'a été déclaré, ni livré, ni reçu"
       ],[
       "Sur au moins une ligne de commande, la quantité souhaitée est au dessus du seuil d'alerte déclaré pour ce produit",
       "Sur au moins une ligne de commande, la quantité attribuée est inférieure à celle saisie par l'alterconso",
       "Sur au moins une ligne de commande, le nombre de paquets mis dans le panier ne correspond pas à la quantité attribuée",
       "Il existe au moins un produit ayant une quantité totale non entière alors qu'il doit être commandé"
       + " en nombre entier par chaque groupe",
       "Il existe au moins un produit ayant une quantité"
       + " livrée / reçue ne correspondant pas à la somme des quantités attribuées",
       "Il existe au moins un produit ayant une quantité déclarée "
       + "reçue (ou le poids total à 5% près) supérieure à celle déclarée livrée",
       "Il existe au moins un produit ayant une quantité déclarée "
       + "reçue (ou le poids total à 5% près) inférieure à celle déclarée livrée",
       "Il existe au moins un produit ayant une quantité déclarée "
       + "livrée (ou le poids total à 5% près) ne correspondant pas au nombre de paquets listés livrés",
       "Il existe au moins un produit ayant une quantité déclarée "
       + "reçue (ou le poids total à 5% près) ne correspondant pas au nombre de paquets listés reçus",
       "Il existe au moins un produit n'ayant été déclaré, ni livré, ni reçu"
      ],[
       "Quantité souhaitée au dessus du seuil d'alerte déclaré pour ce produit",
       "Quantité attribuée inférieure à celle saisie par l'alterconso",
       "Nombre de paquets mis dans le panier ne correspondant pas à la quantité attribuée",
       "Quantité totale de ce produit que peut commander un groupe n'étant pas un nombre entier",
       "Quantité livrée / reçue ne correspondant pas à la somme des quantités attribuées",
       "Quantité déclarée reçue (ou poids total à 5% près) supérieure à celle déclarée livrée",
       "Quantité déclarée reçue (ou poids total à 5% près) inférieure à celle déclarée livrée",
       "Quantité déclarée livrée (ou poids total à 5% près) ne correspondant pas au nombre de paquets listés livrés",
       "Quantité déclarée reçue (ou poids total à 5% près) ne correspondant pas au nombre de paquets listés reçus",
       "Produit n'ayant été déclaré, ni livré, ni reçu"
       ]],

    cptsLabels : {
    	 cmdNch : "Produit commandé mais NON déclaré livré",
    	 cmdNdch : "Produit commandé mais NON déclaré reçu",
    	 cmdETch : "Produit commandé et déclaré livré",
    	 cmdETdch : "Produit commandé et déclaré reçu",
    	 chNcmd : "Produit déclaré livré mais NON commandé",
    	 dchNcmd : "Produit déclaré reçu mais NON commandé"
    },

    cptsIcons : {
   	 cmdNch : "<span class='red bold'>(a)</span>",
   	 cmdNdch : "<span class='red bold'>(b)</span>",
   	 cmdETch : "<span class='italic'>(c)</span>",
   	 cmdETdch : "<span class='italic'>(d)</span>",
   	 chNcmd : "<span class='red bold'>(e)</span>",
   	 dchNcmd : "<span class='red bold'>(f)</span>"
   },

    ALLCPTS : ["cmdNch", "cmdNdch", "chNcmd", "dchNcmd", "cmdETch", "cmdETdch"],
    
	img : function(f) {
		var x = AC.Flag.icons[f];
		return !x ? "" : "<img class='v2Flag' src='images/" + x + ".png'></img>";
	},

	img2 : function(f) {
		var x = AC.Flag.icons[f];
		return !x ? "" : "<img class='v2Flag2' src='images/" + x + ".png'></img>";
	},

	label : function(f, opt){
		var i = AC.Flag.list.indexOf(f);
		var j = opt >= 0 && opt < 3 ? opt : 0;
		return i != -1 ? AC.Flag.flagLabels[j][i] : "";
	},
	
	has : function(flags, flag, mask){
		if (mask == undefined || mask == null) mask = AC.Flag.ALL;
		return flags & flag & mask != 0
	},
	
	listOf : function(flags, mask){
		var msk = mask == undefined || mask == null ? flags : flags & mask;
		var l = [];
		for(var i = 0, f = 0; f = AC.Flag.list[i]; i++)
			if (msk & f)
				l.push(f);
		return l;
	},
	
	print1 : function(flags, mask, opt, notable){
		var l = AC.Flag.listOf(flags, mask);
		if (l.length == 0)
			return "";
		var sb = new StringBuffer();
		if (!notable)
			sb.append("<div class='acTB1B'>");
		for(var i = 0, f = 0; f = l[i]; i++) {
			sb.append("<div class='acTR1'><div class='acTDic2'>");
			sb.append(AC.Flag.img2(f));
			sb.append("</div><div class='acTD2l acTDlast'>");
			sb.append(AC.Flag.label(f, opt));
			sb.append("</div></div>");
		}
		if (!notable)
			sb.append("</div>");
		return sb.toString();
	},

	print1B : function(flags, mask, opt){
		var l = AC.Flag.listOf(flags, mask);
		if (l.length == 0)
			return "";
		var sb = new StringBuffer();
		for(var i = 0, f = 0; f = l[i]; i++) {
			sb.append("<div>");
			sb.append("<div style='float:left'>");
			sb.append(AC.Flag.img2(f));
			sb.append("</div><div class='labelFlag'>");
			sb.append(AC.Flag.label(f, opt));
			sb.append("</div><div class='acEnd'></div></div>");
		}
		return sb.toString();
	},

	printBox : function(flags, mask, statsCpts, statsMask){
		var l = AC.Flag.listOf(flags, mask);
		if (l.length == 0)
			return "";
		var sb = new StringBuffer();
		for(var i = 0, f = 0; f = l[i]; i++) {
			sb.append(AC.Flag.img(f));
		}
		if (statsCpts && statsMask && statsMask.length != 0){
			for(var c in statsCpts){
				if (statsCpts[c] && statsMask.indexOf(c) != -1){
					sb.append(this.cptsIcons[c] + " ");
				}
			}
		}
		return sb.toString();	
	},
	
	printTable : function(statsCpts, statsMask, flagsCpts, flagsMask){
		var sb = new StringBuffer();
		var n = 0;
		sb.append("<div class='tableA'>")
		if (statsCpts && statsMask){
			for(var i = 0, x = null; x = statsMask[i]; i++){
				var c = statsCpts[x];
				if (c){
					sb.append("<div class='trA" + (n % 2) + "'>");
					sb.append("<div class='tdA talc3'>" + this.cptsIcons[x] + "</div>");
					sb.append("<div class='tdB talc3'>" + c + "</div>");
					sb.append("<div class='tdC width90'>" + this.cptsLabels[x] + "</div></div>");
					n++;
				}
			}
		}
		if (flagsCpts && flagsMask){
			for(var i = 0, f = 0; f = this.list[i]; i++){
				if (!(f & flagsMask))
					continue;
				var c = flagsCpts[f];
				if (c){		
					sb.append("<div class='trA" + (n % 2) + "'>");
					sb.append("<div class='tdA talc3'>" + this.img2(f) + "</div>");
					sb.append("<div class='tdB talc3'>" + c + "</div>");
					sb.append("<div class='tdC width90'>" + this.flagLabels[3][i] + "</div></div>");
					n++;
				}
			}
		}
		if (!n)
			return "";
		sb.append("</div>");
		return sb.toString();
	}

}

/****************************************************************/
$.Class("AC.Context", {
	phases : [0, 0, 1, 2, 2, 3, 3, 4],
	//	0 : "pas encore ouverte"
	//	1 : "ouverte aux commandes"
	//	2 : "en chargement ou en transport"
	//	3 : "en déchargement / distribution des paniers"
	//	4 : "archivée"

	roles : ["", "Administrateur Général", "Administrateur d'Annuaire", "Alterconso",
	         "Animateur de Groupe d'alterconsos", "Producteur", "Animateur de Groupement de producteurs"],

 	roles2 : ["", "Administrateur Général", "Administrateur de l'Annuaire ", "Alterconso du groupe ",
	         "Animateur du groupe ", "Producteur du groupement ", "Animateur du groupement "],

}, {
	// 
	init : function() {
		APP.Ctx = this;
		this.name = "Ctx";
		this.dir = null;
		this.nomDir = null;
		this.nomType = null;
		this.nomGrp = null;
		this.seconds = 0;
		this.authDir = 0;
		this.myDirs = [];
		/*
		 * -1 : admin générale, -2 : admin locale 0 : non authentifié, 1 : gac,
		 * 2 gap
		 */
		this.authType = 0;
		this.authGrp = 0;
		this.authGac = 0;
		this.authGap = 0;
		this.authUsr = 0;
		this.authAc = 0;
		this.authAp = 0;
		this.authPower = 0;
		this.authDate = 0;
		this.authRole = 0;
		this.currentMode = 0; // 1:GAP 2:GAC 3:AC
		this.authPwd = null;
		this.typedPwd = null;
		this.authLevel = 0;
		this.delta = 0;
		this.getArgs();
		
		var clientId = AC.local("clientId");
		if (!clientId)
			clientId = Math.floor(Math.random() * 1000000) * 1000;
		else
			clientId = parseInt(clientId, 10);
		var pfx = Math.floor(clientId / 1000);
		var sfx = clientId % 1000 ;
		sfx++;
		if (sfx >= 1000)
			sfx = 1;
		this.clientId = (pfx * 1000) + sfx;
		AC.local("clientId", this.clientId);
		
		this.daltonien = AC.local("daltonien");
		var p = AC.local("kbpref");
		this.kbpref = ISTOUCH || p == "1" ? 1 : 0;
	},
	
	go : function(){
		var args = {_GET:true, _isRaw:true, op:"0", operation:"ping"};
		AC.Req.post(this, "alterconsos/ping", args, function(result){
			ACSRV.localStartTime = AC.AMJ.sysTime();
			var rs = JSON.parse(result);
			ACSRV.serverStartTime = rs.time;
			AC.AMJ.getTime();
			this.delta = ACSRV.localStartTime - ACSRV.serverStartTime;
			if (APP.Ctx.authDate && (APP.Ctx.authDate < AC.AMJ.premierJour || APP.Ctx.authDate > AC.AMJ.dernierJour))
				APP.Ctx.authDate = 0;

			if (AC.dbg)
				AC.info("delta:" + this.delta 
					+ " local:"	+ new Date(ACSRV.localStartTime).stdFormat() 
					+ " serveur:" + new Date(ACSRV.serverStartTime).stdFormat() 
					+ " maintenant:" + AC.AMJ.getTime().stdFormat());

			APP._acTimeInfo.html("<div class='acsBtnTI'><img class='acsBtnTImg' src='images/info.png'/></div>"
					+ "<span id='acDateHeure' class='acDateHeure'></span>");
			APP.oncl(this, APP._acTimeInfo.find(".acsBtnTI"), function(){
				AC.Help.gotoHelp("Page_" + AC.Page.current.nom);
			});
			this._dateHeure = APP._acTimeInfo.find("#acDateHeure");
			APP.run2(true);
		}, function(){
			APP.run2(false);
		});
	},

	getPwd : function(mdp, type, code) {
		return SHA1("" + mdp + type + code);
	},

	getArgs : function() {
		// a1.r1.g1.u1.c1.d121201
		APP.Ctx.args = {a:0, r:0, g:0, u:"", c:""}
		if ("ACSRVa" in window)
			APP.Ctx.args.a = ACSRVa;
		APP.Ctx.authRole = 0;
		APP.Ctx.args.r = 0;
		if ("ACSRVr" in window && (ACSRVr > 0 && ACSRVr < 7)) {
			APP.Ctx.authRole = ACSRVr;
			APP.Ctx.args.r = ACSRVr;
		}
		if ("ACSRVg" in window)
			APP.Ctx.args.g = ACSRVg;
		if ("ACSRVu" in window)
			APP.Ctx.args.u = ACSRVu;
		if ("ACSRVc" in window)
			APP.Ctx.args.c = ACSRVc;
		if ("ACSRVd" in window)
			APP.Ctx.authDate = ACSRVd;
		
		if (!APP.Ctx.authRole)
			APP.Ctx.args.g = 0;
		else
			APP.Ctx.authType = [0, -1, -2, 1, 1, 2, 2][APP.Ctx.authRole];
		if (APP.Ctx.authRole != 3 && APP.Ctx.authRole != 5) {
			APP.Ctx.args.u = "";
			APP.Ctx.args.c = "";				
		}
	},

	setDateHeure : function(){
		if (!this._dateHeure)
			return;
		var now = AC.AMJ.getTime();
		var d = AC.AMJ.dateLongue(AC.AMJ.aujourdhui);
		var hour = now.getHours();
		var minute = now.getMinutes();
		var seconde = now.getSeconds();
		var hhmmss = "" + (hour < 10 ? '0' + hour : hour) + ":" 
			+ (minute < 10 ? '0' + minute : minute) + ":" 
			+ (seconde < 10 ? '0' + seconde : seconde);
		this._dateHeure.html(d + " - " + hhmmss);		
	},

	setUsr : function(){
		var _identite = APP._identite;
		
		if (APP.Ctx.authType == -1){
			APP._acBarPhoto.attr("src", "images/Superman-64x64.jpg");
			_identite.html("Administrateur Général des Annuaires");
			return;
		}
		
		var resilie = false;
		this.eltDir = null;
		this.eltGrp = null;
		this.eltUsr = null;
		var m1 = "Annuaire";
		var photo = "images/icon.png";
		var role = "";
		
		if (APP.Ctx.authDir && APP.Ctx.dir.version != -1) {
			this.eltDir = this.master.getElement(0, APP.Ctx.authDir);
			var m1 = "Annuaire " + (this.eltDir.label + " [" + this.eltDir.initiales + "]").escapeHTML();
		}
		
		if (APP.Ctx.authType == -2){
			_identite.html("Administrateur de l'" + m1);
			return;
		}

		if (APP.Ctx.authRole) 
			role = AC.Context.roles2[APP.Ctx.authRole];
		
		if (this.eltDir) {
			if (APP.Ctx.authRole) {
				role = AC.Context.roles2[APP.Ctx.authRole];
				if (APP.Ctx.authGrp) {
					this.eltGrp = APP.Ctx.dir.getElement(APP.Ctx.authType > 0 ? APP.Ctx.authType : 0, APP.Ctx.authGrp);
					m1 = role + (this.eltGrp.label + " [" + this.eltGrp.initiales + "]").escapeHTML();
					photo = "alterconsos/mime/" + (this.authType == 1 ? "C." : "P.") + this.eltGrp.code + "./1./PHOTO/";
					if (this.eltGrp.suppr)
						resilie = true;
					if (APP.Ctx.authRole == 3 || APP.Ctx.authRole == 5){
						if (APP.Ctx.authUsr){
							if (APP.Ctx.loginGrp && APP.Ctx.loginGrp.code == APP.Ctx.authGrp && APP.Ctx.loginGrp.type() == APP.Ctx.authType) {
								this.eltUsr = APP.Ctx.loginGrp.getContact(APP.Ctx.authUsr);
								if (this.eltUsr) {
									var n = this.eltUsr.initiales + "/ " + (this.eltUsr.adherent ? this.eltUsr.adherent : this.eltUsr.code);
									var m = (this.eltUsr.nom + " [" + n + "]").escapeHTML();
									// m1 = "<span class='color" + this.eltUsr.color + "'>" + m + ", " + m1 + "</span>";
									m1 = "<span>" + m + ", " + m1 + "</span>";
									if (this.eltUsr.suppr)
										resilie = true;
									photo = "alterconsos/mime/" + (this.authType == 1 ? "C." : "P.")
										+ this.eltGrp.code + "./" + this.eltUsr.code + "./PHOTO/" + this.eltUsr.nph;
								} else {
									// m1 = "<span class='color" + this.eltGrp.color + "'>" + APP.Ctx.authUsr + ", " + m1 + "</span>";
									m1 = "<span>" + APP.Ctx.authUsr + ", " + m1 + "</span>";
								}
							} else {
								// m1 = "<span class='color" + this.eltGrp.color + "'>" + APP.Ctx.authUsr + ", " + m1 + "</span>";
								m1 = "<span>" + APP.Ctx.authUsr + ", " + m1 + "</span>";
							}
						} else {
							// m1 = "<span class='color0'>" + m1 + "</span>";
							m1 = "<span>" + m1 + "</span>";
						}
					} else {
						// m1 = "<span class='color" + this.eltGrp.color + "'>" + m1 + "</span>";
						m1 = "<span>" + m1 + "</span>";
					}
				} else {
					m1 = AC.Context.roles[APP.Ctx.authRole];
				}
			}
		}
		_identite.html(m1);
		APP._acBarPhoto.attr("src", photo);
	},
			
	onCellsChange : function(cells){
		this.setUsr();
	}
//
});

/************************************************************/
$.Class("AC.Root", {
	started : false,

	CLICK : "click",
	
	KEYUP : "keyup input",
	
	cleanupTO : 300000, // 5 minutes (scan)
	cleanupTO2 : 1800, // 30 minutes (vie après dernier detach)
	
	colors : [],
	
	NOPROPAG : function(event) {
		event.stopPropagation();
	},

	oncl : function(caller, id, cb){
		var idx = typeof id == "string" ? this.id(caller, id) : id;
		idx.off(this.CLICK).on(this.CLICK, {cb:cb, caller:caller}, function(event){
			APP.NOPROPAG(event);
			event.data.cb.call(event.data.caller, $(event.currentTarget), event);
		});			
	},
	
	id : function(caller, id){
		return caller._content.find(("[data-ac-id='" + id + "']"));
	},

	altc : function(color){
		if (APP.Ctx.daltonien) {
			if (!this.colorPaire){
				this.colorPaire = true;
				return " color00 ";
			}
			this.colorPaire = false;
			return " color99 ";
		}
		if (color == 16) {
			if (!this.colorPaire){
				this.colorPaire = true;
				return " color00 ";
			}
			this.colorPaire = false;
			return " color99 ";
		}
		return " color" + color + " ";
	},
		
	goHome : function() {
		AC.Page.current.close(function(){
			AC.Page.get("login").open();
			AC.Page.get("login").login();
		});
	},

	goOut : function() {
		window.location = "aurevoir.html";
	},

	reload : function() {
		setTimeout(function(){
			location.reload(true);
		}, 2000);
	},
	
	refreshStatus : function(){
		APP.Ctx.setDateHeure();
		AC.IconBar.setStatus();
	},

	run : function() {
		this.nom = "APP";
		this.startPhase = true;
		if (AC.dbg)
			AC.info("Alterconsos started ...");

		AC.AMJ.setup();
		AC.Message.setup();
		AC.IconBar.setup();
		AC.RequestErrorClass.setup();
		AC.Mask.setup();

		this._hdiv = $("#acHiddenDiv");
		for(var i = 0; i < 16; i++)
			this._hdiv.append("<div class='xx color" + i + "'>a</div>");
		this._hdiv.find(".xx").each(function(i){
			APP.colors[i] = $(this).css("background-color");
		});
		this._hdiv.html("");

		this._maskB = $("#acMaskB");
		
		this._content = $("#content");
		this._bottom = $("#bottom");
		this._acPanel2 = $("#acPanel");

		this._acBarPhoto = $("#acBarPhoto");
		this._acTimeInfo = $("#acTimeInfo");
		this._identite = $("#acIdentite");

		var fs = $("html").css("font-size");
		this.normalFontSize = parseInt(fs.substring(0, fs.length - 2), 10);
		if (AC.dbg)
			AC.info("HTML font size initiale : " + APP.normalFontSize + "px");
		var n2 = AC.local("fontsize");
		if (n2 && n2 != "0")
			$("html").css("font-size", "" + n2 + "px");

		APP.origin = ACSRV.url;
		APP.originDocS = APP.origin + "/document/";

		new AC.Context();
		APP.Ctx.go();
	},
	
	run2 : function(ok){
		if (!ok){
			APP.goOut();
			return;
		}
		this.refreshStatus();
		new AC.Timer(this, -5000, null, this.refreshStatus);
		APP.Ctx.master = AC.Directory.getN(0);
		APP.Ctx.master.attach(this);
		APP.Ctx.master.fixed = true;
		if (APP.Ctx.args.an)
			AC.Directory.getN(APP.Ctx.args.an);
		APP.Ctx.setUsr();
		
		AC.Stack.enable();
		
		AC.Req.sync(this, function() {
			APP.Ctx.setUsr();
			AC.Page.get("login").open();
			AC.Page.get("login").login();
		}, function(){
			APP.goOut();
			return;			
		});
	},
		
	start : function() {
		APP.Ctx.dir = AC.Directory.getN(APP.Ctx.authDir);
		APP.Ctx.dir.fixed = true;
		APP.Ctx.dir.attach(APP.Ctx);
		APP.startPhase = false;
		APP.Ctx.currentMode = APP.Ctx.authType == 2 ? 1 : (APP.Ctx.authUsr ? 3 : 2);
		
		if (APP.Ctx.authType < 0) {
			AC.Req.sync(this, function() {
				AC.Cell.cleanup();
				AC.Page.get("annuaire").open();
			});
			return;
		}

		var gapc = null;
		
		if (APP.Ctx.authType == 1) {
			gapc = AC.GAC.getN(APP.Ctx.authGrp);
			APP.Ctx.loginGac = gapc;
			APP.Ctx.loginGac.fixed = true;
			APP.Ctx.loginGap = null;
		}
		
		if (APP.Ctx.authType == 2) {
			APP.Ctx.loginGac = null;
			gapc = AC.GAP.getN(APP.Ctx.authGrp);
			APP.Ctx.loginGap = gapc;
			APP.Ctx.loginGap.fixed = true;
			APP.Ctx.ctlg = AC.Catalogue.getN(APP.Ctx.authGrp);
			APP.Ctx.ctlg.fixed = true;
		}
		
		var dirs = APP.Ctx.dir.getElement(APP.Ctx.authType, APP.Ctx.authGrp).dirs;
		for(var i = 0; i < dirs.length; i++){
			var dir = dirs[i];
			if (dir) {
				var c = AC.Calendrier.getN(dir);
				c.fixed = true;
				if (dir == APP.Ctx.authDir)
					APP.Ctx.cal = c;
			}
			if (dir != APP.Ctx.authDir){
				AC.Directory.getN(dir).fixed = true;
				APP.Ctx.myDirs.push(dir);
			}
		}
		
		APP.Ctx.loginGrp = gapc;
		APP.Ctx.loginGrp.attach(APP.Ctx);
		APP.Ctx.setUsr();
		AC.Req.sync(this, function() {
			if (APP.Ctx.authType == 1) {
				APP.Ctx.livrG = AC.LivrG.getN(APP.Ctx.authGrp);
				APP.Ctx.livrG.fixed = true;
			}
			if (APP.Ctx.authType == 2) {
				APP.Ctx.livrP = AC.LivrP.getN(APP.Ctx.authGrp, (APP.Ctx.authUsr ? "X" : "Y"));
				APP.Ctx.livrP.fixed = true;
			}
			AC.Req.sync(this, function() {
				AC.Cell.cleanup();
				AC.Page.get("ac2").open();
			});
		});
		return;
	}
	
}, {});

/** **************************************************************** */
$.Class("AC.Page", {

	pages : {}, 
	
	current : null,
		
	get : function(nom) {
		var x = AC.Page.pages[nom];
		if (x)
			return x;
		if (nom == "login")
			return new AC.login("login");
		if (nom == "annuaire")
			return APP.Ctx.authType == -1 ? new AC.MasterDir() : new AC.LocalDir();
		if (nom == "ac2")
			return new AC.ac2().init("ac2");
	}

}, {
	init : function(nom) {
		this.isOpen = false;
		this.nom = nom;
		AC.Page.pages[this.nom] = this;
	},

	open : function() {
		if (AC.dbg)
			AC.info("open page : " + this.nom);
		this.isOpen = true;
		AC.Page.current = this;
		Util.opacity1(APP._bottom);
		APP._bottom.html("");
	},

	onMenu : function(action){
		switch (action) {
		case 'aide' : {
			AC.Help.gotoHelp("home");
			return;
		}
		case 'sync' : {
			AC.Req.sync();
			return;
		}
		case 'about' : {
			new AC.About();
			return;
		}
		case 'quit' : {
			APP.goOut();
			return;
		}
		}
	},

	close : function(cb, timeOut) {
		this.isOpen = false;
		if (AC.dbg)
			AC.info("close page : " + this.nom);
		if (timeOut){
			setTimeout(function(){
				APP._bottom.html("");
				if (cb)
					cb();
				return;
			}, timeOut);
		} else {
			APP._bottom.html("");
			if (cb)
				cb();
		}
	}

});

/** **************************************************************** */
AC.Page("AC.login", {

html1 : "<div id='login'>"

	+ "<div class='ac-space1rem' data-ac-id='dir'>"
	+ "<div class='acdd-label italic'>Annuaire : </div>"
	+ "<div class='aclogbox' data-ac-id='selectdir'></div></div>",
	
html2b : "<div class='ac-space1rem' data-ac-id='role'>"
	+ "<div class='italic'>Rôle:</div>"
	+ "<div data-ac-id='selectrole'></div></div>",

html3 : "<div class='ac-space1rem' data-ac-id='gac'>"
	+ "<div class='acdd-label italic'>Groupe : </div>"
	+ "<div class='acdd-box2  aclogbox' data-ac-id='selectgac'></div></div>"

	+ "<div class='ac-space1rem' data-ac-id='gap'>"
	+ "<div class='italic'>Groupement : </div>"
	+ "<div class='acdd-box2  aclogbox' data-ac-id='selectgap'></div></div>"

	+ "<div data-ac-id='usr'>"
	+ "<div class='aclogin-label'>"
	+ "<div class='italic'>Identifiant (numéro d'adhérent ou initiales) :</div></div>"
	+ "<div class='aclogin-inp'><input type='text' data-ac-id='usrinp' /></div>"
	+ "<div class='small bold aclogin-dg' data-ac-id='usrdiag'>&nbsp;</div></div>"
			
	+ "<div data-ac-id='pwd'>"
	+ "<div class='entrer2'><div class='entrer' data-ac-id='ok'>Entrer</div></div>"
	+ "<div style='margin-right: 15rem'><div class='aclogin-label'>"
	+ "<div class='italic'>Mot de passe :</div></div>"
	+ "<div class='aclogin-inp'><input class='acInput' type='password' data-ac-id='pwdinp' /></div></div></div>"
	
	+ "<div class='aclogin-dg' data-ac-id='pwddiag'>&nbsp;</div>"
	
	+ "<div data-ac-id='idea' class='aclogin-label'>"
	+ "<img class='aclogin-idea' src='images/idee.png'></img>"
	+ "<div>Pour accélérer une prochaine visite, cliquer <a href='/ac/home.html'>"
	+ "<span class='large bold'>ICI</span></a> et à"
	+ " la réouverture de la page la mettre en \"favori\" de votre navigateur."
	+ "</div></div>"
	+ "<div class='acsBtnTI'><img class='acsBtnTImg' src='images/info.png'/></div>"
	+ "<a data-ac-id='acces' href='/app'>Accès universel à l'application...</a>"
	+ "<div class='acEnd'></div>",
	
html0 : "<div class='acAvert'>"
	+ "<div><a href='/index.html' target='_blank'>"
	+ "<div style='float:right' class='large'>En savoir plus ...</div>"
	+ "<img src='images/logo-ac-1S.png' style='width:20rem;margin-right:2rem;vertical-align:middle'></img>"
	+ "</a></div>"
	+ "Dans tous les navigateurs il existe un bouton \"retour en arrière\", "
	+ " (en général une flèche vers la gauche) qui fait revenir à la page précédente "
	+ "dans l'historique de navigation et un bouton \"avancer\", (en général "
	+ "une flèche vers la droite) qui fait afficher la page suivante dans l'historique de navigation.<br>"
	+ "L'usage d'un de ces boutons <span class='bold italic red'>fait sortir de l'application</span>. "
	+ "C'est peut-être ce vous souhaitiez ... ou pas.<br><br>"
	+ "Dans tous les navigateurs il existe un bouton \"actualiser\", (en général une flèche circulaire) "
	+ "qui recharge la page depuis son site. L'usage de ce bouton <span class='bold italic red'>"
	+ "recharge l'application au début de la session en perdant l'état courant</span>. "
	+ "C'est peut-être ce vous souhaitiez, en particulier si l'application était figée ... ou pas.<br><br>"
	+ "<img src='images/resync-15s.jpg'></img> Ce bouton de la barre d'outils en haut à gauche, "
	+ " \"resynchronise\" l'état visible avec les dernières mises à jour "
	+ "faites par les autres sessions.<br>"
	+ "<i>15s</i> indique que l'état visible à l'écran "
	+ "correspond aux données enregistrées dans le serveur il y a 15 secondes. Depuis d'autres sessions "
	+ "que la votre ont pu effectuer des mises non répercutées sur votre écran ... ou non.<br>"
	+ "Toutes les conséquences des mises à jours faites depuis votre session sont <b>toujours</b> répercutées "
	+ "sur votre écran sans avoir à resynchroniser."
	+ "<div class='acSpace2 orange italic'><span class='large bold'>Plus d'informations à propos de l'application : "
	+ "</span>présentation, nouveautés, historique, vidéos, aide en ligne ... "
	+ "<a href='https://sites.google.com/site/alterconsosapp/' target='_blank'>"
	+ "<span class='large bold'>Cliquer ici</span></a></div>"
	+ "</div>"

}, {
	init : function(nom) {
		this._super(nom);
	},

	close : function(cb, timeOut) {
		var self = this;
		setTimeout(function(){
			self._login.css("left", "-100%");
		},10);
		this._super(cb, 250);
	},

	btnDir : function(){
	},

	open : function() {
		this._super();
		AC.IconBar.set(this, 0);
		AC.IconBar.enableBack(false);
		AC.IconBar.enableForward(false);
		AC.Cell.cleanupFiltered(["LivrP", "LivrG", "LivrC"]);
		this._super();
		if (APP.Ctx.loginGrp)
			APP.Ctx.loginGrp.detach(APP.Ctx);
		if (APP.Ctx.dir)
			APP.Ctx.dir.detach(APP.Ctx);
		if (APP.Ctx.master)
			APP.Ctx.master.detach(APP.Ctx);
		this._login = APP._bottom;
		if (!APP.startPhase) {
			// retour d'une autre page
			APP.startPhase = true;
			if (this.step == 5)
				this.login5b();
		}
		return this;
	},

	login : function() {
		APP._bottom.html(this.constructor.html0 + this.constructor.html1 + this.constructor.html2b 
				+ this.constructor.html3);
		this._login = APP._bottom.find("#login");
		this._dir = this._login.find("[data-ac-id='dir']").css("display", "none");
		this._role = this._login.find("[data-ac-id='role']").css("display", "none");
		this._gac = this._login.find("[data-ac-id='gac']").css("display", "none");
		this._gap = this._login.find("[data-ac-id='gap']").css("display", "none");
		this._usr = this._login.find("[data-ac-id='usr']").css("display", "none");
		this._idea = this._login.find("[data-ac-id='idea']").css("display", "none");
		this._pwd = this._login.find("[data-ac-id='pwd']").css("display", "none");
		this._btns = this._login.find("[data-ac-id='btns']");
		this._usrinp = this._login.find("[data-ac-id='usrinp']");
		
		APP.oncl(this, this._login.find(".acsBtnTI"), function(target){
			AC.Help.gotoHelp("Login");			
		});
		
		this._ok = this._login.find("[data-ac-id='ok']");
		Util.btnEnable(this._ok, false);

		this.masterDecor = APP.Ctx.master.decor(0, null, function(elt) {
			return (!elt.suppr || APP.Ctx.authType < 0) && elt.code;
		}, true);

		this.rolesDecor = [];
		for(var i = 3; i < AC.Context.roles.length; i++)
			this.rolesDecor.push({code:i, label:AC.Context.roles[i]});
			
		var self = this;
		this._ok.off(APP.CLICK).on(APP.CLICK, function(event) {
			APP.NOPROPAG(event);
			self.login9();
		});
		
		this._content = this._login;
		
		new AC.RadioButton(this, "selectdir", this.masterDecor);
		this._selectdir.jqCont.removeClass("acdd-box2");
		this._selectdir.jqCont.off("dataentry").on("dataentry", function(){
			APP.Ctx.authDir = self._selectdir.val();
			APP.Ctx.myDirs = [APP.Ctx.authDir];
			if (APP.Ctx.args.r != 2)
				APP.Ctx.authRole = 0;
			self._selectgac.html("");
			self._selectgap.html("");
			APP.Ctx.authUsr = 0;
			APP.Ctx.authGrp = 0;
			APP.Ctx.authGap = 0;
			APP.Ctx.authGac = 0;
			self.login1();
		});
		
		if (!APP.Ctx.args.r)
			APP.Ctx.authRole = 0;
		var self = this;
		new AC.RadioButton(this, "selectrole", this.rolesDecor);
		this._selectrole.jqCont.off("dataentry").on("dataentry", function(){
			APP.Ctx.authRole = self._selectrole.val();
			self._selectgac.html("<div class='acdd-itemValue color-1'>Cliquer ici pour choisir</div>");
			self._selectgap.html("<div class='acdd-itemValue color-1'>Cliquer ici pour choisir</div>");
			APP.Ctx.authUsr = 0;
			APP.Ctx.authGrp = 0;
			APP.Ctx.authGap = 0;
			APP.Ctx.authGac = 0;
			self.login3();
		});
		
		this._selectgac = this._login.find("[data-ac-id='selectgac']");
		this._selectgac.parent().off(APP.CLICK).on(APP.CLICK, function(event) {
			APP.NOPROPAG(event);
			self.openGac();
		});

		this._selectgap = this._login.find("[data-ac-id='selectgap']");
		this._selectgap.parent().off(APP.CLICK).on(APP.CLICK, function(event) {
			APP.NOPROPAG(event);
			self.openGap();
		});

		this._pwdinp = this._login.find("[data-ac-id='pwdinp']");
		this._pwdinp.val("");
		this._pwddiag = this._login.find("[data-ac-id='pwddiag']");
		this._pwddiag.html("&nbsp;");
		this._pwdinp.off(APP.KEYUP).on(APP.KEYUP, function(event) {
			APP.NOPROPAG(event);
			if (event.keyCode == 13) {
				if (Util.isEnable(self._ok))
					self.login9();
			} else {
				var val = self._pwdinp.val();
				if (!val || val.length == 0) {
					self._pwddiag.html("Valeur à saisir");
					APP.Ctx.typedPwd = null;
					self.login5b();
				} else {
					self._pwddiag.html("&nbsp;");
					APP.Ctx.typedPwd = val;
					self.login6();
				}
			}
		});

		this._usrinp.val("");
		this._usrdiag = this._login.find("[data-ac-id='usrdiag']");
		this._usrdiag.html("&nbsp;");
		this._usrinp.off(APP.KEYUP).on(APP.KEYUP, function(event) {
			APP.NOPROPAG(event);
			var val = self._usrinp.val();
			if (!val || val.length == 0) {
				self._usrdiag.html("Valeur à saisir");
				APP.Ctx.authUsr = null;
				self.login4();
			} else {
				self._usrdiag.html("&nbsp;");
				APP.Ctx.authUsr = val;
				self.login5();
			}
		});

		this._ideaATag = this._idea.find("a");
		this._ideaATag.off(APP.CLICK).on(APP.CLICK, function(event) {
			APP.NOPROPAG(event);
			window.location = $(event.currentTarget).attr("href");
		});

		this.first = true;
		if (APP.Ctx.args.a) {
			for ( var i = 0, x = null; x = this.masterDecor[i]; i++) {
				if (APP.Ctx.args.a == x.code) {
					APP.Ctx.authDir = x.code;
					APP.Ctx.myDirs = [APP.Ctx.authDir];
					this.login1();
					return;
				}
			}
		}
		if (APP.Ctx.args.r == 1){
			APP.Ctx.dir = APP.Ctx.master;
			APP.Ctx.authDir = 0;
			APP.Ctx.myDirs = [APP.Ctx.authDir];
			APP.Ctx.authRole = 1;
			this.login3();
		} else {
			if (APP.Ctx.args.r == 2)
				APP.Ctx.authRole = 2;
			this.login0();
		}
	},
		
	openGac : function() {
		var self = this;
		AC.DD2.register(self._selectgac, APP.Ctx.dir.decor(1, null,
				function(elt){
					return !elt.removed;
				}, true), true, function(x) {
					self.setGac(x.code);
				});		
	},
	
	openGap : function() {
		var self = this;
		AC.DD2.register(self._selectgap, APP.Ctx.dir.decor(2, null,
				function(elt){
					return !elt.removed;
				}, true), true, function(x) {
					self.setGap(x.code);
				});
	},
	
	setInfo : function(){
		var t = []
		APP.Ctx.setUsr();
		if (APP.Ctx.authDir && APP.Ctx.authDir == APP.Ctx.args.a){
			this._dir.css("display", "none");
			if (APP.Ctx.authRole && APP.Ctx.authRole == APP.Ctx.args.r){
				this._role.css("display", "none");
				if (APP.Ctx.authType > 0) {
					if (APP.Ctx.authGrp && APP.Ctx.authGrp == APP.Ctx.args.g){
						if (APP.Ctx.authType == 1){
							this._gac.css("display", "none");
						} else {
							this._gap.css("display", "none");
						}
					}
				}
			}
		}
		var href = "";
		if (APP.Ctx.dir) {
			href += "a" + APP.Ctx.dir.code;
			if (APP.Ctx.authRole) {
				href += ".r" + APP.Ctx.authRole;
				if (APP.Ctx.authGrp) {
					href += ".g" + APP.Ctx.authGrp;
					if (APP.Ctx.authUsr) {
						href += ".u" + APP.Ctx.authUsr;
					}
				}
			}
		}
		if (APP.Ctx.authDate)
			href += ".d" + APP.Ctx.authDate;
		if (APP.Ctx.authDir)
				this._idea.css("display", "block");
		if (this._ideaATag)
			this._ideaATag.attr("href",  "app?" + href);
	},

	show : function() {
		if (this.first) {
			this._login.css("display", "block");
			var self = this;
			setTimeout(function(){
				self._login.css("left", "0");
				$(window).scrollTop();
			},50);
		}
		this.first = false;
	},
	
	login0 : function(){
		this.step = 0;
		this.show();
		this._dir.css("display", "block");
	},

	login1 : function(){
		this.step = 1;
		AC.Message.info("Chargement de l'annuaire en cours ...");
		APP.Ctx.dir = AC.Directory.getN(APP.Ctx.authDir);
		APP.Ctx.nomDir = Util.editEltT(APP.Ctx.master.getElement(0, APP.Ctx.authDir));
		AC.Req.sync(this, function() {		
			var elt = APP.Ctx.master.getElement(0, APP.Ctx.authDir);
			if (elt && !elt.suppr)
				this.login2();
			else
				this.login0();
		})		
	},
		
	login2 : function(){
		// dir défini et chargé
		// roles : ["", "Administrateur Général", "Administrateur d'Annuaire", "Alterconso",
		// "Animateur de Groupe", "Producteur", "Animateur de Groupement"]
		// a1.r1.g1.u1.c1.d121201
		this.step = 2;
		this.show();
		if (!APP.Ctx.authRole) {
			this._role.css("display", "block");
			this.setInfo();
			return;
		}
		this.login3();
	},
	
	setGac : function(g){
		APP.Ctx.authGrp = g;
		APP.Ctx.authGap = 0;
		APP.Ctx.authGac = g;
		this._usrinp.val("");
		if (APP.Ctx.authRole == 4) {
			APP.Ctx.authUsr = 0;
			this.login5();
		} else
			this.login4();
	},

	setGap : function(g){
		APP.Ctx.authGrp = g;
		APP.Ctx.authGac = 0;
		APP.Ctx.authGap = g;
		this._usrinp.val("");
		if (APP.Ctx.authRole == 6) {
			APP.Ctx.authUsr = 0;
			this.login5();
		} else
			this.login4();
	},

	login3 : function(){
		// dir et role défini
		this.step = 3;
		APP.Ctx.authType = [0, -1, -2, 1, 1, 2, 2][APP.Ctx.authRole];
		var elt = APP.Ctx.dir.getElement(APP.Ctx.authType > 0 ? APP.Ctx.authType : 0, APP.Ctx.args.g);
		if (!elt || elt.suppr || elt.removed)
			APP.Ctx.args.g = 0;
		if (!APP.Ctx.args.g){
			APP.Ctx.args.u = "";
			APP.Ctx.args.c = "";			
		}
		
		this._gap.css("display", "none");
		this._gac.css("display", "none");
		this._usr.css("display", "none");
		this._pwd.css("display", "none");
		Util.btnEnable(this._ok, false);
		this.show();
		
		if (APP.Ctx.authType <= -1) {
			this.login5();
			return;			
		}

		if (APP.Ctx.authType == 1) {
			if (APP.Ctx.args.g) {
				this.setGac(APP.Ctx.args.g);
				return;
			}
			this._gac.css("display", "block");
			this.setInfo();
			this.openGac();
			return;
		}

		if (APP.Ctx.authType == 2) {
			if (APP.Ctx.args.g) {
				this.setGap(APP.Ctx.args.g);
				return;
			}
			this._gap.css("display", "block");
			this.setInfo();
			this.openGap();
			return;
		}
		
	},
	
	login4 : function(){
		// dir, role et grp définis, usr à définir
		this.step = 4;
		if ((APP.Ctx.authRole == 3 || APP.Ctx.authRole == 5) && APP.Ctx.args.u == "0")
			APP.Ctx.args.u = null;
		if (APP.Ctx.args.u) {
			APP.Ctx.authUsr = APP.Ctx.args.u;
			this.login5();
			return;			
		}
		this._usr.css("display", "block");
		this.setInfo();
	},
	
	login5 : function(){
		// pwd reste à définir
		this.step = 5;
		if (APP.Ctx.args.c) {
			APP.Ctx.typedPwd = APP.Ctx.args.c;
			this._pwdinp.val(APP.Ctx.typedPwd);
			this.login9();
			return;			
		}
		this.login5b();
	},

	login5b : function(){
		// pwd reste à définir
		this._pwd.css("display", "block");
		this.setInfo();
		if (APP.Ctx.typedPwd)
			Util.btnEnable(this._ok, true);
	},

	login6 : function(){
		// OK enable
		this.step = 6;
		Util.btnEnable(this._ok, true);
	},
	
	login9 : function() {
		if (!APP.Ctx.typedPwd) {
			APP.Ctx.authPwd = null;
		} else {
			if (APP.Ctx.typedPwd.startsWith("0") && !APP.Ctx.typedPwd.startsWith("00")) {
				APP.Ctx.authPwd = APP.Ctx.typedPwd;
			} else {
				APP.Ctx.authPwd = APP.Ctx.getPwd(APP.Ctx.typedPwd, APP.Ctx.authType < 0 ? 0 : APP.Ctx.authType,
					APP.Ctx.authType < 0 ? APP.Ctx.authDir : APP.Ctx.authGrp);
			}
		}
		APP.startPhase = false;
		var arg = {op:"1", operation:"Vérification de signature", _signature:true};
		AC.Req.post(this, "alterconsos", arg, function() {
			AC.Message.info("Authentification réussie");
			if (APP.Ctx.authType == 1)
				APP.Ctx.authAc = APP.Ctx.authUsr;
			else if (APP.Ctx.authType == 2)
				APP.Ctx.authAp = APP.Ctx.authUsr;
			this.setInfo();
			this.close(APP.start);
		}, function(error) {
			APP.startPhase = true;
			this._pwd.css("display", "block");
			this._pwddiag.html("<span class='red'><b>" + error.text.escapeHTML() + "</b></span>");
			AC.Message.error(error.shortText);			
		});
	}
	
});

/***********************************************************/
AC.SmallScreen = function(cn){
	if (cn)
		this.className = cn;
}
AC.SmallScreen._static = {
	instructionsA : "Au choix : utiliser le <b>clavier \"tactile\"</b> ou utiliser le <b>clavier de l'ordinateur</b> pour frapper les chiffres 0 à 9<br>"
		+ "<b>Ne pas frapper de virgule</b> : 1,200Kg est obtenu en appuyant sur 1 2 0 0 (ou en tapant au clavier sur 1 2 0 0)<br>"
		+ "<b>Pour effacer le dernier caractère frappé</b>, appuyer sur le bouton \"X\" (comme sur son téléphone), ou au clavier presser \"Effacer arrière\" ou \"Suppr\"<br>"
		+ "<b>Pour saisir à la chaîne plusieurs paquets</b> : à la fin de chaque paquet appuyer sur le bouton \"Suivant\" ou au clavier presser \"Tab\"<br>"
		+ "<b>Après saisie du dernier paquet</b>, appuyer sur le bouton \"Fin\" ou au clavier presser \"Entrée\" (ça ferme le clavier)<br>"
		+ "<b>Pour fermer le clavier à tout instant</b> appuyer sur le bouton \"Echap\" ou au clavier presser \"Echap\"",

	instructionsB : "Au choix : utiliser le <b>clavier \"tactile\"</b> ou utiliser le <b>clavier de l'ordinateur</b> pour frapper les chiffres 0 à 9<br>"
		+ "<b>Pour effacer le dernier caractère frappé</b>, appuyer sur le bouton \"X\" (comme sur son téléphone), ou au clavier presser \"Effacer arrière\" ou \"Suppr\"<br>"
		+ "<b>Pour terminer la saisie de la quantité</b>, appuyer sur le bouton \"Entrée\" ou au clavier presser \"Entrée\" (ça ferme le clavier)<br>"
		+ "<b>Pour fermer le clavier à tout instant</b> appuyer sur le bouton \"Echap\" ou au clavier presser \"Echap\"",
		
	instructionsC : "Au choix : utiliser le <b>clavier \"tactile\"</b> ou utiliser le <b>clavier de l'ordinateur</b> pour frapper les chiffres 0 à 9<br>"
		+ "<b>Pour saisir \",5\"</b> appuyer sur le bouton <b>\",5\"</b> ou au clavier presser <b>\",\"</b> "
		+ "(virgule) sans le 5 qui suit.<br>"
		+ "<b>Pour effacer le dernier caractère frappé</b>, appuyer sur le bouton \"X\" (comme sur son téléphone), ou au clavier presser \"Effacer arrière\" ou \"Suppr\"<br>"
		+ "<b>Pour terminer la saisie de la quantité</b>, appuyer sur le bouton \"Entrée\" ou au clavier presser \"Entrée\" (ça ferme le clavier)<br>"
		+ "<b>Pour fermer le clavier à tout instant</b> appuyer sur le bouton \"Echap\" ou au clavier presser \"Echap\"",

	instructionsD : "Au choix : utiliser le <b>clavier \"tactile\"</b> ou utiliser le <b>clavier de l'ordinateur</b> pour frapper les chiffres 0 à 9<br>"
		+ "<b>Ne pas frapper de virgule</b> : 1,200Kg est obtenu en appuyant sur 1 2 0 0 (ou en tapant au clavier sur 1 2 0 0)<br>"
		+ "<b>Pour effacer le dernier caractère frappé</b>, appuyer sur le bouton \"X\" (comme sur son téléphone), ou au clavier presser \"Effacer arrière\" ou \"Suppr\"<br>"
		+ "<b>Pour valider</b>, appuyer sur le bouton \"Entrée\" ou au clavier presser \"Entrée\" (ça ferme le clavier)<br>"
		+ "<b>Pour fermer le clavier à tout instant</b> appuyer sur le bouton \"Echap\" ou au clavier presser \"Echap\"",

	instructionsE : "Au choix : utiliser le <b>clavier \"tactile\"</b> ou utiliser le <b>clavier de l'ordinateur</b> pour frapper les chiffres 0 à 9<br>"
			+ "<b>Ne pas frapper de virgule</b> : 12,45€ est obtenu en appuyant sur 1 2 4 5 (ou en tapant au clavier sur 1 2 4 5)<br>"
			+ "<b>Pour effacer le dernier caractère frappé</b>, appuyer sur le bouton \"X\" (comme sur son téléphone), ou au clavier presser \"Effacer arrière\" ou \"Suppr\"<br>"
			+ "<b>Pour valider</b>, appuyer sur le bouton \"Entrée\" ou au clavier presser \"Entrée\" (ça ferme le clavier)<br>"
			+ "<b>Pour fermer le clavier à tout instant</b> appuyer sur le bouton \"Echap\" ou au clavier presser \"Echap\"",

		
	getW : function(){
		return AC.SmallScreen._screen.width();
	},
	
	getH : function(){
		return AC.SmallScreen._screen.height();
	},
	
	html1 : "<div class='bar' id='bar'>"		
		+ "<div class='retour'>Retour Synthèse</div>"
		+ "<div class='help'>Aide</div>"
		+ "<div class='printBar' id='printBar'></div>"
		+ "<div class='annuler'>Annuler Saisies</div>"
		+ "<div class='valider'>Valider</div>"
		+ "</div>"


}
AC.SmallScreen._proto = {
	className : "SmallScreen",
		
	init : function(width, html, valText, closeText, titleText, cart){
		AC.SmallScreen._screen = $("#smallscreen");
		var _screen = AC.SmallScreen._screen;
		AC.SmallScreen.zindex = _screen.css("z-index");
		_screen.css("width", "100%");
		_screen.css("height", "100%");
		_screen.css("display", "block");
		var sb = new StringBuffer();
		if (cart)
			sb.append("<div id='smallinnerCart'>" + cart + "</div>");
		sb.append("<div id='smallinner'>");
		sb.append("<div id='smallscreenhelp' class='maFonteA'><div id='smallscreenhelpclose'>Fermer l'Aide</div>"
				+ "<div id='smallscreenhelptext'></div></div>");
		sb.append("<div id='smallscreenmask'></div>");

		sb.append("<div class='bar' id='bar'>");

		if (closeText === true)
			sb.append("<div class='fermer' id='fermer'>Fermer</div>");
		else
			sb.append("<div id='fermer' id='fermer'>" + (closeText ? closeText : "Annuler") + "</div>");

		sb.append("<div class='help'>Aide</div>");
		
		if (valText)
			sb.append("<div id='smallinnerV' data-ac-id='" + valText 
					+ "' class='valider'>" + valText + "</div>");
		if (titleText)
			sb.append("<div class='titre'><div class='titre2'>" + titleText + "</div></div>");
		sb.append("</div>");
		
		sb.append("<div class='intext' id='smallinnertext'>");
		sb.append(html);
		sb.append("<div id='filler' class='filler'></div></div></div>");
		_screen.html(sb.toString());
		this._cartouche = _screen.find("#smallinnerCart");
		this._valider = _screen.find("#smallinnerV");
		this._annuler = _screen.find("#smallinnerA");
		this._fermer = _screen.find("#fermer");
		this._content = _screen.find("#smallinnertext");
		this._mask = _screen.find("#smallscreenmask");
		this._inner = _screen.find("#smallinner");
		this._bar = _screen.find("#bar");
		this._help = this._bar.find(".help");
		this._diag = this._content.find("[data-ac-id='diag']");
		return this;
	},
	
	show : function(caller, callback){
		this.__caller = caller,
		this.__callback = callback;
		var _screen = AC.SmallScreen._screen;
		_screen.off(APP.CLICK); // Superstition
		AC.oncl(this, _screen.find("#fermer"), function(){
			if (this.__callback)
				this.__callback.call(this.__caller, false);
			else
				this.retour();
		});
		AC.oncl(this, this._valider, function(){
			if (this.__callback)
				this.__callback.call(this.__caller, true);
			else
				this.enregistrer();
		});
		AC.oncl(this, this._annuler, function(){
			if (this.__callback)
				this.__callback.call(this.__caller, false);
			else
				this.retour();
		});
		AC.oncl(this, this._help, function(){
			var h = this.constructor.help;
			if (!h) {
				AC.Help.gotoHelp(this.className);
				return;
			}
			this._inner.find("#smallscreenhelp").css("display", "block");
			this._inner.find("#smallscreenhelptext").html(h);
			AC.oncl(this, this._inner.find("#smallscreenhelpclose"), function(){
				this._inner.find("#smallscreenhelptext").html("");
				this._inner.find("#smallscreenhelp").css("display", "none");				
			});
		});
		var self = this;
		setTimeout(function(){
			self._inner.css("opacity", 1.0);
		}, 10);
		return this;
	},
	
	setDiag : function(msg, info) {
		if (info || !msg) {
			this._diag.css("color", "black");
			this._diag.css("font-weight", "normal");
			this.error = null;
			this._diag.text(msg ? msg : "");
		} else {
			this._diag.css("color", "red");
			this._diag.css("font-weight", "bold");
			this.error = msg;
			this._diag.text(msg);
		}
		AC.Message.diag(msg, !info);
	},

	setDiagH : function(msg, info) {
		if (info || !msg) {
			this._diag.css("color", "black");
			this._diag.css("font-weight", "normal");
			this.error = null;
			this._diag.html(msg ? msg : "");
		} else {
			this._diag.css("color", "red");
			this._diag.css("font-weight", "bold");
			this.error = msg;
			this._diag.html(msg);
		}
		AC.Message.diag(this._diag.text(), !info);
	},

	kbShow : function(qpe, nul, DFSVE, echo, oups, instructions){
		// opt: DFSVE - touches spéciales
		// qpe : q:qte p:poids e:euro
		// nul: ? accepté comme null
		// echo : qp qe pe p e q null
		this.hasKF = DFSVE.indexOf("F") != -1;
		this.hasKS = DFSVE.indexOf("S") != -1;
		this.hasKV = DFSVE.indexOf("V") != -1;
		this.hasKE = DFSVE.indexOf("E") != -1;
		this.kbDemi = DFSVE.indexOf("D") != -1;
		this.kbQpe = qpe;
		this.kbNull = nul;
		this._unit.html({q:"", p:"Kg", e:"€"}[this.kbQpe]);
		if (!oups)
			this._oups.css("display", "none");
		else
			this._oups.html(oups);
		if (!instructions)
			this._instructions.css("display", "none");
		else
			this._instructions.html(instructions);
		this.echo = echo;
		this._echo1.css("display", "none");
		this._echo2.css("display", "none");
		if (this.echo){
			if (this.echo.length > 0)
				this._echo1.css("display", "inline-block");
			if (this.echo.length > 1)
				this._echo2.css("display", "inline-block");
//			this.conv = new AC.Conv(this.pd, this.cv, this.reduc);
		} 
		this.kbMax = qpe == "p" || qpe == "e" ? 1000000 : (this.kbDemi ? 2000 : 1000);
		this._kbcellF.css("display", !this.hasKF ? "none" : "table-cell");
		this._kbcellS.css("display", !this.hasKS ? "none" : "table-cell");
		this._kbcellV.css("display", !this.hasKV ? "none" : "table-cell");
		this._kbcellE.css("display", !this.hasKE ? "none" : "table-cell");
		this._kbcellD.css("visibility", DFSVE.indexOf("D") == -1 ? "hidden" : "visible");
		if (!this.kbPerm) {
			this._keyboard.css("display", "block");
			this._mask.css("display", "block");
		}
		this._keyboard.attr("tabindex", "0");
		this._keyboard.focus();
		var self = this;
		this._keyboard.off("keydown").on("keydown", function(event){
			event.preventDefault();
			event.stopPropagation();
			var c = (event.keyCode ? event.keyCode : event.which);
			if (c == 8 || c == 46)
				self.keyBS();
			else if (c >= 48 && c <=57)
				self.key09(c - 48);
			else if (c >= 96 && c <=105)
				self.key09(c - 96);
			else if ((c == 188 || c == 190) && self.kbDemi)
				self.key09(10);
			else if (c == 27)
				self.keySP("X");
			else if (c == 9 && self.hasKS)
				self.keySP("S");
			else if (c == 13 && self.hasKE)
				self.keySP("E");
			else if (c == 13 && self.hasKV)
				self.keySP("V");
			else if (c == 13 && self.hasKF)
				self.keySP("F");
		});
		var pp = (this.kbQpe == "p" || this.kbQpe == "e") && this.gap_prod;
		if (pp) {
			this._keyboard.find(".poidsprix").css("display", "block");
			new AC.RadioButton(this, "poidsPrixKB", AC.KBLPGac2.poidsPrix);
			this._poidsPrixKB.val(AC.ac2.euro[this.gap_prod] ? 1 : 2);
			this.swEuro(self._poidsPrixKB.val());
			this._poidsPrixKB.jqCont.off("dataentry").on("dataentry", function() {
				self.swEuro(self._poidsPrixKB.val());
			});
		} else
			this._keyboard.find(".poidsprix").css("display", "none");
	},
	
	kbHide : function(){
		if (!this.kbPerm) {
			if (this._keyboard)
				this._keyboard.css("display", "none");
			this._mask.css("display", "none");
		}
	},
	
	keyboard : function(sb, perm){
		this.kbPerm = perm;
		sb.append("<div id='keyboard' class='keyboard" + (perm ? "1" : "2") + "'>");
		if (this.gap_prod)
			sb.append("<div class='choisirprix poidsprix'>Quand le paquet a un prix ET un poids, <b> saisir le PRIX</b></div>");
		sb.append("<div id='kbdiag' class='kbdiag'></div>");
		sb.append("<div class='action3' id='oups'></div>");
		sb.append("<div class='kbRight'>");
		sb.append("<div class='acValue3 fixed' id='value'></div>");
		sb.append("<div class='acUnit fixed' id='unit'>Kg</div>");
		sb.append("<div class='kbcellSuppr'></div>");
		sb.append("<div class='acEcho fixed' id='echo1'></div>");
		sb.append("<div class='acEcho fixed' id='echo2'></div>");
		sb.append("<div class='kbcellFin kbcellSP' id='kbcellF'>Fin</div>");
		sb.append("<div class='kbcellSuiv kbcellSP' id='kbcellS'>Suivant</div>");
		sb.append("<div class='kbcellEnter kbcellSP' id='kbcellV'>Valider</div>");
		sb.append("<div class='kbcellEnter kbcellSP' id='kbcellE'>Entrée</div>");
		if (this.gap_prod)
			sb.append("<div data-ac-id='poidsPrixKB' class='poidsprix'></div>");

		sb.append("</div>");	

		sb.append("<div class='kbtable2'>");
		sb.append("<div class='kbrow'>");
		sb.append("<div class='kbcell' data-index='1'>1</div>");
		sb.append("<div class='kbcell' data-index='2'>2</div>");
		sb.append("<div class='kbcell' data-index='3'>3</div>");
		sb.append("</div>");
		sb.append("<div class='kbrow'>");
		sb.append("<div class='kbcell' data-index='4'>4</div>");
		sb.append("<div class='kbcell' data-index='5'>5</div>");
		sb.append("<div class='kbcell' data-index='6'>6</div>");
		sb.append("</div>");
		sb.append("<div class='kbrow'>");
		sb.append("<div class='kbcell' data-index='7'>7</div>");
		sb.append("<div class='kbcell' data-index='8'>8</div>");
		sb.append("<div class='kbcell' data-index='9'>9</div>");
		sb.append("</div>");
		sb.append("<div class='kbrow'>");
		sb.append("<div class='kbcellEsc kbcellSP' id='kbcellX'>Annuler</div>");
		sb.append("<div class='kbcell' data-index='0'>0</div>");
		sb.append("<div class='kbcell' id='kbcellD' data-index='10'>,5</div>");
		sb.append("</div>");
		sb.append("</div>");
		
		sb.append("<div class='acEnd'></div>");
		sb.append("<div class='small italic' id='instructions'></div></div>");
	},

	swEuro : function(v) {
		if (this.gap_prod) {
			if ((v == 1 && this.euro) || (v == 2 && !this.euro)) return;
			var val = this.val;
			if (v == 1) {
				this.euro = true;
				this.kbQpe = "e";
				AC.ac2.euro[this.gap_prod] = true;
				if (v != -1)
					this.val = this.conv.p2e(val).res;
			} else {
				this.kbQpe = "p";
				delete AC.ac2.euro[this.gap_prod];
				this.euro = false;
				if (v != -1)
					this.val = this.conv.e2p(val).res;				
			}
			if (this._poidsPrix)
				this._poidsPrix.val(this.euro ? 1 : 2);
			if (this._keyboard.css("display") == "block") {
				this.echo = this.euro ? "p" : "e";
				this._unit.html({q:"", p:"Kg", e:"€"}[this.kbQpe]);
				this.displayVal();
			}
		}
	},

	displayVal : function(){
		if (this.val == -1){
			this._value.html("?");
			if (this.onVal && this._keyboard) this.onVal();
			return;
		}
		switch (this.kbQpe){
		case "q" : {
			if (!this.kbDemi) {
				this._value.html("" + this.val);
				break;
			}
			if (this.val == 0) {
				this._value.html("0");
				break;						
			}
			if (this.val % 2 == 0) {
				this._value.html("" + Math.round(this.val / 2));
				break;			
			}
			this._value.html("" + Math.floor(this.val / 2) + ",5");
			break;
		}
		case "p" : {
			var v = "" + this.val;
			if (v.length <= 3)
				this._value.html("0." + "000".substring(0, (3 - v.length)) + v);
			else
				this._value.html(v.substring(0, v.length - 3) + "," + v.substring(v.length - 3, v.length));			
			break;
		}
		case "e" : {
			var v = "" + this.val;
			if (v.length <= 2)
				this._value.html("0." + "00".substring(0, (2 - v.length)) + v);
			else
				this._value.html(v.substring(0, v.length - 2) + "," + v.substring(v.length - 2, v.length));						
			break;
		}
		}
		if (this.onVal && this._keyboard) this.onVal();
		if (this.echo && this.echo.length > 0){
			this.displayEcho(1, this.echo.charAt(0));
			if (this.echo.length > 1)
				this.displayEcho(2, this.echo.charAt(1));
		}
	},
	
	displayEcho : function(pos, qpe){
		var meth = this.conv[this.kbQpe + "2" + qpe];
		var s = meth.call(this.conv, this.val).ed();
		this["val" + qpe] = this.conv.res;
		this["_echo" + pos].html(s);
	},
	
	registerKB : function(){
		this._keyboard = this._inner.find("#keyboard");
		this._kbdiag = this._keyboard.find("#kbdiag");
		this._kbcellF = this._keyboard.find("#kbcellF");
		this._kbcellS = this._keyboard.find("#kbcellS");
		this._kbcellV = this._keyboard.find("#kbcellV");
		this._kbcellE = this._keyboard.find("#kbcellE");
		this._kbcellD = this._keyboard.find("#kbcellD");
		this._value = this._keyboard.find("#value");
		this._echo1 = this._keyboard.find("#echo1");
		this._echo2 = this._keyboard.find("#echo2");
		this._unit = this._keyboard.find("#unit");
		this._oups = this._keyboard.find("#oups");
		this._instructions = this._keyboard.find("#instructions");
		AC.oncl(this, this._keyboard.find(".kbcellSP"), function(target){
			var key = target.attr("id").substring(6);
			this.keySP(key);
		});
		AC.oncl(this, this._oups, function(target){
			this.keySP("O");
		});
		AC.oncl(this, this._keyboard.find(".kbcellSuppr"), function(target){
			this.keyBS();
		});
		AC.oncl(this, this._keyboard.find(".kbcell"), function(target){
			this.key09(parseInt(target.attr("data-index"), 10));
		});
	},
	
	keySP : function(key){
		if (key == "X" || key == "O")
			this.kbHide();
		this.onKB(key);
	},
	
	keyBS : function(){
		if (this.val == -1)
			return;
		if ((!this.kbDemi && this.val < 10) || (this.kbDemi && (this.val % 2 == 0) && this.val < 20)) {
			this.val = 0;
		} else {
			if (!this.kbDemi) {
				this.val = Math.floor(this.val / 10);
			} else {
				if (this.val % 2 != 0)
					this.val = this.val - 1;
				else
					this.val = Math.floor(this.val / 20) * 2;
			}
		}
		if (this.val == 0 && this.kbNull)
			this.val = -1;
		this.displayVal();
	},
	
	key09 : function(key){
		if (key == 10) {
			if (this.val == -1)
				this.val = 0;
			if (this.val % 2 != 0)
				return;
			this.val++;
			this.displayVal();
			return;
		}
		if (this.kbDemi && this.val != -1 && this.val % 2 != 0)
			return;
		if (key == 0) {
			if (this.val == -1) {
				this.val = 0;
				this.displayVal();
				return;
			}
			if (this.val == 0 || this.val >= this.kbMax)
				return;
			this.val = this.val * 10;
			this.displayVal();
			return;				
		}
		if (this.val == -1 || this.val == 0) {
			this.val = this.kbQpe == "q" && this.parDemi ? 2 * key : key;
			this.displayVal();
			return;
		}
		if (this.val >= this.kbMax)
			return;
		this.val = (this.val * 10) + (this.kbQpe == "q" && this.parDemi ? 2 * key : key);
		this.displayVal();
	},
	
//	getDim : function(){
//		return this.dim;
//	},
	
	retour : function(){
		if (this.enEdition()) {
			if (window.confirm("Des saisies NON validées sont en cours.\n"
					+ "Voulez-vous vraiement fermer cette boîte et les perdre ?"))
				this.close();
		} else
			this.close();
	},
		
	enEdition : function() {
		return false;
	},
	
	enErreur : function() {
		return false;
	},
		
	enregistrer : function() {
	},
	
	enable : function(){
		var enab = this.enEdition() && !this.enErreur();
		Util.btnEnable(this._valider, enab);
		this._cartouche.css("display", enab ? "none" : "block");
	},
	
	top : function(){
		AC.SmallScreen._screen.css("z-index", "1000");
		AC.SmallScreen._screen.find(".help").css("display", "none");
	},

	close : function(cb){
		if (this.caller && this.caller.openPopForm)
			this.caller.openPopForm = null;
		var _screen = AC.SmallScreen._screen;
		var callback = cb;
		setTimeout(function(){
			_screen.find("#smallinner").css("opacity", 0.0);
			setTimeout(function(){
				_screen.html("");
				_screen.css("display", "none");
				_screen.css("z-index", AC.SmallScreen.zindex);
				if (cb)
					cb();
			}, 200);
		}, 10);
	}
	
}
AC.declare(AC.SmallScreen);

/** ******************************************************** */
AC.Maps = function(){}
AC.Maps._static = {}
AC.Maps._proto = {
	className : "Maps",
	
	init : function(elt) {
		var html = "<div id='maps' class='acMaps'></div>";
		var title = "Localisation de " + elt.nom.escapeHTML();
		AC.SmallScreen.prototype.init.call(this, 600, html, null, true, title);
		this.show();
		this._maps = this._content.find("#maps");
	    var geocoder = new google.maps.Geocoder();
	    var self = this;
	    geocoder.geocode( { 'address': elt.localisation, region:"fr"}, function(results, status) {
	    	if (status == google.maps.GeocoderStatus.OK) {
	    		var loc = results[0].geometry.location;
	    		var mapOptions = {
	  				zoom: 16,
	  				center: loc
	  			};
	    		self.map = new google.maps.Map(self._maps[0], mapOptions);
	    	    var marker = new google.maps.Marker({
	    	    	map: self.map,
	    	        position: loc
	    	    });
	    	} else {
	    		AC.Message.error("L'adresse de localisation [" + elt.localisation + "] ne peut pas être résolue par "
	    		+ "Google maps.");
	    	}
	    });
	  }

}
AC.declare(AC.Maps, AC.SmallScreen);

AC.PU = function(pu, reduc) {
	return reduc ? Math.floor(((100 - reduc) * pu) / 100) : pu;
}

AC.PUed = function(sb, pd, pu, reduc) {
	var puR = AC.PU(pu, reduc);
	sb.append("<div class='acPuProd detail'>");	
	sb.append(INT.editE(puR));
	if (pu != puR)
		sb.append("<span class='barre'>" + INT.editE(pu) + "</span>");
	sb.append(pd.type != 1 ? "/Kg</div>" : "</div>");
}

/** ******************************************************** */
AC.Conv = function(pd, cv, reduc){
	this.type = pd.type;
	this.pu = AC.PU(cv.pu, reduc);
	this.parDemi = pd.parDemi;
	this.poids = cv.poids;
	this.reduc = reduc;
}
AC.Conv._static = {}
AC.Conv._proto = {
	className : "Conv",
	
	q2p : function(q){
		switch (this.type) {
		case 1 : {
			this.res = (this.parDemi ? q / 2  : q) * this.poids;
			break;
		}
		case 2 : {
			this.res = q * this.poids;
			break;
		}
		case 3 : {
			this.res = this.parDemi ? Math.round(q / 2 * this.poids) : q * this.poids;
			break;
		}
		}
		this.last = "p";
		return this;
	},

	q2e : function(q){
		switch (this.type) {
		case 1 : {
			this.res = (this.parDemi ? q / 2  : q) * this.pu;
			break;
		}
		case 2 : 
		case 3 : {
			this.q2p(q);
			this.res = Math.round(this.res * this.pu / 1000);
			break;
		}
		}
		this.last = "e";
		return this;
	},

	p2q : function(p){
		switch (this.type) {
		case 1 : {
			if (p == 0)
				this.res = 0;
			else
				this.res = Math.round((this.parDemi ? p * 2 : p) / this.poids);
			break;
		}
		case 2 : {
			this.res = Math.round(p / this.poids);
			break;
		}
		case 3 : {
			if (p == 0)
				this.res = 0;
			else {
				if (this.parDemi) {
					var p1 = (this.parDemi ? p * 2 : p) / this.poids;
					if (p1 < 0.2)
						this.res = 0.2;
					else
						this.res = Math.floor(p1 * 10) / 10;
				} else
					this.res = Math.round(p / this.poids);
			}
			break;
		}
		}
		this.last = "q";
		return this;
	},

	p2e : function(p){
		switch (this.type) {
		case 1 : {
			this.p2q(p);
			this.res = this.res * this.pu;
			break;
		}
		case 2 : 
		case 3 : {
			this.res = Math.round(p * this.pu / 1000);
			break;
		}
		}
		this.last = "e";
		return this;
	},

	e2q : function(e){
		switch (this.type) {
		case 1 : {
			this.res = Math.round((this.parDemi ? e * 2 : e) / this.pu);
			break;
		}
		case 2 : 
		case 3 : {
			this.e2p(e);
			this.p2q(this.res);
			break;
		}
		}
		this.last = "q";
		return this;
	},

	e2p : function(e){
		switch (this.type) {
		case 1 : {
			this.e2q(e);
			this.res = this.res * this.poids;
			break;
		}
		case 2 : 
		case 3 : {
			this.res = Math.round(e * 1000 / this.pu);
			break;
		}
		}
		this.last = "p";
		return this;
	},
	
	edq : function(q){
		return this.parDemi ? this.editQ1(q) : "" + q;
	},

	ede : function(e){
		return INT.editE(e);
	},

	edp : function(p){
		return INT.editKg(p);
	},

	ed : function(){
		switch (this.last) {
		case "q" : {
			return this.edq(this.res);
		}
		case "e" : {
			return this.ede(this.res);
		}
		case "p" : {
			return this.edp(this.res);
		}
		}
	},
	
	editQ1 : function(q) {
		if (!q)
			return "0";
		var q1 = Math.round(q * 5);
		var k = Math.floor(q1 / 10);
		var r = q1 % 10;
		if (r == 0)
			return "" + k;
		if (k == 0)
			return "0," + r;
		return k + "," + r;
	},

	edqS : function(oldq, q, y, es){
		var y1 = y ? "<div class='acModifie'>" : "<div class='bold'>";
		var o = oldq != -1 ? "<span class='barre'>&nbsp;" + this.edq(oldq) + "</span>  " : "";
		return y1 + o + this.edq(q) + (es ? es : "") + "</div>";
	},

	edpS : function(oldp, p, y, es){
		var y1 = y ? "<div class='acModifie'>" : "<div class='bold'>";
		var o = oldp != -1 ? "<span class='barre'>&nbsp;" + this.edp(oldp) + "</span>  " : "";
		return y1 + o + this.edp(p) + (es ? es : "") + "</div>";
	},

	edqC : function(oldq, q, p, y, es){
		var y1 = y ? "<div class='acModifie'>" : "<div class='italic'>";
		var calc = "<span class='italic'> (" + this.edp(p) + "&nbsp;/&nbsp;" + this.edp(this.poids) + ")</span>";
		var o = oldq != -1 ? "<span class='barre'>&nbsp;" + this.edq(oldq) + "</span>  " : "";
		return y1 + o + this.edq(q) + calc + (es ? es : "") + "</div>";
	},

	edpC : function(oldp, q, p, y, es){
		var y1 = y ? "<div class='acModifie'>" : "<div class='italic'>";
		var calc = "<span class='italic'> (" + this.edq(q) + "&nbsp;x&nbsp;" + this.edp(this.poids) + ")</span>";
		var o = oldp != -1 ? "<span class='barre'>&nbsp;" + this.edp(oldp) + "</span>  " : "";
		return y1 + o + this.edp(p) + calc + (es ? es : "") + "</div>";
	},
	
	edeCp : function(e, p, y, es){
		var y1 = y ? "<div class='acModifie'>" : "<div class='italic'>";
		var ee = y1 + this.ede(e) + "</span>";
		var calc = "<span class='italic'> (" + this.edp(p) + "&nbsp;x&nbsp;" + this.ede(this.pu) + ")</span>";
		return y1 + this.ede(e) + calc + (es ? es : "") + "</div>";
	}

}
AC.declare(AC.Conv);

/** ******************************************************** */
AC.PrintBox2 = function(){}
AC.PrintBox2._static = {
	html1 : "Imprimer<br>enreg.</div>",
		
	html2 : "<div class='acBarInfo' id='info'></div>"
		+ "<div data-ac-id='diag' class='acBarDiag2'></div>"
		+ "<div id='pbwork1'>&nbsp;</div>"
		+ "<div id='pbwork2'></div>",

	form0 : "<div><div class='acdd-labelL'>Taille de la fonte : </div>"
		+ "<div data-ac-id='fontsize'></div></div>"
		+ "<div class='acSpace1' data-ac-id='remPageBreak'></div>"
		+ "<div class='acSpace05'>"
		+ "<div class='btn1 valider'>Valider ces options</div>"
		+ "<div class='acSpace05'>"
		+ "<div class='acLabel3'>Nom de l'état :</div>"
		+ "<div class='acEntryF fixed bold large'>"
		+ "<input type='text' value='alterconsos'></div></div>",
	
	lkHtml : "<a id='htmlHref' class='htmlHref' target='_blank'>Lien vers l'état HTML ...</a>",
	
	form1 : "<div class='btn1 print'>Imprimer</div>"
		+ "<div class'btn1Info'>Le navigateur doit disposer de la facilité d'impression et "
		+ "avoir au moins une imprimante accessible</div>"
		+ "<div class='acEnd'></div><div class='acSpace1'></div>"
		+ "<div class='btn1 preview'>Aperçu dans un nouvel onglet</div>"
		+ "<div class'btn1Info'>Le navigateur doit être configuré pour accepter cette possibilité. "
		+ "Sinon sur un clic-droit (ou équivalent) sur le lien ci-dessus, "
		+ "choisir <b>\"Ouvrir le lien dans un nouvel onglet\"</b></div>"
		+ "<div class='acEnd'></div><div class='acSpace1'></div>"
		+ "<div class='btn1 save'>Enregistrer sous ...</div>"
		+ "<div class'btn1Info'>Ce raccourci n'est pas supporté par tous les navigateurs.<br>"
		+ "En cas d'échec, effectuer un clic-droit (ou équivalent) sur le lien ci-dessus et "
		+ "choisir <b>\"Enregistrer le lien sous ...\"</b></div>"
		+ "<div class='acEnd'></div><div class='acSpace1'></div>"
		+ "<div id='savoirplus'>En savoir plus ...</div>"
		+ "<div class='bold italic orange large'>Autres services de conversion sur Internet ...</div>"
		+ "<div id='detail' style='display:none'>"
		+ "<br>Ces services ont tous besoin de l'adresse du lien vers le document à convertir."
		+ "<br><br>Copier cette adresse dans le presse papier en effectuant un clic droit (ou équivalent) "
		+ "sur <i>\"Lien vers l'état HTML ...\"</i> ci-dessus et en choissant l'option de menu "
		+ "<b>\"Copier l'adresse du lien\"</b>."
		+ "<br><br>La liste de sites ci-après est donnée à titre d'exemple et sans garantie dans le temps :"
		+ "<ul><li><a target='_blank' href='http://web-capture.net/'>web-capture.net</a><br></li>"
		+ "<li><a target='_blank' href='http://screenshotmachine.com/'>screenshotmachine.com</a><br></li>"
		+ "<li><a target='_blank' href='http://www.page2images.com/URL-Live-Website-Screenshot-Generator'>"
		+ "page2images.com</a><br></li>"
		+ "</ul></div>",
	
	form3 : "<div class='btn1 preview btn1PB'>Aperçu dans un nouvel onglet</div>"
		+ "<div>Le navigateur doit être configuré pour accepter cette possibilité. "
		+ "Sinon sur un clic-droit (ou équivalent) sur le lien ci-dessus, "
		+ "choisir <b>\"Ouvrir le lien dans un nouvel onglet\"</b></div>"
		+ "<div class='acEnd'></div><div class='acSpace1'></div>"
		+ "<div class='fakeBtnPB'>Imprimer</div>"
		+ "<div>Cliquer sur le lien et utiliser l'option de menu <b>\"Imprimer\"</b> du navigateur</div>"
		+ "<div class='acEnd'></div><div class='acSpace1'></div>"
		+ "<div class='fakeBtnPB'>Enregistrer sous ...</div>"
		+ "<div>Cliquer sur le lien et utiliser l'option de menu <b>\"Enregistrer sous ...\"</b> du navigateur</div>"
		+ "<div class='acEnd'></div><div class='acSpace1'></div>",

	links1 : "<link rel='stylesheet' href='",
	links3 : "/js/app.css' type='text/css'>\n",
	media1 : "<style type='text/css'>\n@media screen{html{font-size:",
	media2 : "%;}}\n@media print{html{font-size:",
	media3 : "<style type='text/css'>\nhtml{font-size:",
	media4 : ";}\n</style>",

	htmlP1 : "<!DOCTYPE html>\n<html>\n<head>\n<title>",
	htmlP2 : "</title>\n"
		+ "<meta http-equiv='cache-control' content='no-cache'>\n" 
		+ "<meta http-equiv='pragma' content='no-cache'>\n"
		+ "<meta http-equiv='Content-Type' content='text/html; charset=utf-8'>\n"
		+ "</head>\n<body>\n",
	htmlP3 : "</div>\n</body>\n</html>",

	decor : [{code:1, label : " 75% - Petite taille"}, 
	         {code:2, label : "100% - Taille moyenne"},
	         {code:3, label : "150% - Grande taille"},]
	
}
AC.PrintBox2._proto = {
	className : "PrintBox",
	
	init : function(_box, _div){
		_box.html(AC.PrintBox2.html1);
		this._div = _div;
		AC.oncl(this, _box, this.start);
	},
	
	start : function(){
		this.urls = null;
		this.phase = 0;
		var pb = AC.PrintBox2;
		var titre = "Impression, affichage ou conversion de l'état";
		// init : function(width, html, valText, closeText, titleText){
		this.smallScreen = new AC.SmallScreen("PrintBox").init(-600, pb.html2, false, true, titre);
		this._content = this.smallScreen._content;
		this._info = this._content.find("#info");
		this._work1 = this._content.find("#pbwork1");
		this._work2 = this._content.find("#pbwork2");
		this._work2.html(pb.form0);
		this._input = this._work2.find("input");
		if (this._input.length != 0) {
			if (!pb.fnSave)
				pb.fnSave = "alterconsos";
			this._input.val(pb.fnSave);
		}
		this._rpb = new AC.CheckBox2(this, "remPageBreak", "Enlever les sauts de page pour économiser le papier");
		
		this._fs = new AC.RadioButton(this, "fontsize", pb.decor);
		if (!pb.defSize)
			pb.defSize = 2;
		this._fs.val(pb.defSize);
		var self = this;
		this._fs.jqCont.off("dataentry").on("dataentry", function(event){
			APP.NOPROPAG(event);
			var v = self._fs.val();
			pb.defSize = v;
			self._fs.val(v);
		});
		this._info.html("Choix des options de présentation de l'état");
		this.smallScreen.show(this, this.enregistrer);
		AC.oncl(this, this._work2.find(".valider"), this.phase0);
	},

	enregistrer : function(ok){
		if (!ok){ // annuler
			this.smallScreen.close();
			return;
		}
	},
		
	transform : function(sb){
		var inps = this._div.find("input");
		var tas = this._div.find("textarea");
		var html = this._div.html();
		if (inps.length != 0 || tas.length != 0) {
			var hdiv = APP._hdiv;
			hdiv.html(html);
			hdiv.find("input").each(function(index) {
				var val = inps.eq(index).val();
				$(this).replaceWith("<div class='ac-input fixed'>" 
					+ (val ? val.escapeHTML() : "&nbsp;") + "</div>");
			});
			hdiv.find("textarea").each(function(index) {
				var v = tas.eq(index).val();
				var val = v.escapeHTML().replace(/\n/g, "<br>");
				$(this).replaceWith("<div class='ac-input fixed'>" 
					+ (val ? val : "&nbsp;")  + "</div>");
			});
			html = hdiv.html();
		}
		var y = "src=\"" + APP.origin;
		var x = html.replace(/src=\"\alterconsos/g, y + "/alterconsos")
			.replace(/src=\"\images/g,	y + "/images");
		sb.append(this._rpb.val() ? x.replace(/page-break-before:always;/g, '') : x);
	},
	
	scDefSize : function(pb){
//		return ["55", "45", "60", "90"][pb.defSize];
		return ["55", "40", "55", "65"][pb.defSize];
	},

	prDefSize : function(pb){
//		return ["45", "35", "45", "70"][pb.defSize];
		return ["55", "40", "55", "65"][pb.defSize];
	},

	style : function(sb, pb){
		sb.append(pb.htmlP1);
		var fn = this._input.val();
		pb.fnSave = fn;
		sb.append(fn);
		sb.append(pb.htmlP2);
		sb.append("<div id='rapport'>");
		sb.append(pb.links1);
		sb.append(APP.origin);
		sb.append(pb.links3);
		sb.append(pb.media1);
		sb.append(this.scDefSize(pb));
		sb.append(pb.media2);
		sb.append(this.prDefSize(pb));
		sb.append("%;}}\n</style>\n");
	},
	
	phase0 : function(){
		this.smallScreen.setDiag("Génération de l'état en cours ...", true);
		var pb = AC.PrintBox2;
		var sb = new StringBuffer();
		this.style(sb, pb);
		this.transform(sb);
		sb.append(pb.htmlP3);
		
		var html = sb.toString();
		var arg = {op:"90"};
		arg.nom = pb.fnSave;
		arg.mime = "text/html";
		arg.text = html;
		arg._isRaw = true;
		arg.operation = "Génération de l'état";
		AC.Req.post(this, "alterconsos", arg, this.phase1, function(data){
			this.smallScreen._valider.css("display", "none");
			this.smallScreen.setDiagH("<b>Echec de la génération de l'état.</b> Fermer cette boîte et tenter ultérieurement.");
		});
	},
	
	phase1 : function(url){
		var pb = AC.PrintBox2;
		this.smallScreen.setDiag("", true);
		this._info.html("Etat HTML généré disponible");
		this.name = url;
		// this.url = APP.originDoc + url;
		this.urls = APP.originDocS + url;
		this.phase = 1;
		this._work1.html(pb.lkHtml);
		this._work2.html(pb.form1);
		this._refh = this._work1.find("#htmlHref");
		this._refh.attr("href", this.urls);
		var sp = this._work2.find("#savoirplus");
		var dt = this._work2.find("#detail");
		AC.oncl(this, this._work2.find(".preview"), function(){
			window.open(this.urls, "_blank");
			this.smallScreen.close();
		});
		AC.oncl(this, this._work2.find(".save"), this.saveIt);
		AC.oncl(this, this._work2.find(".print"), this.printIt);
		AC.oncl(this, sp, function(){
			if (dt.css("display") == "none"){
				dt.css("display", "block");
				sp.html("Cacher cette information");
			} else {
				dt.css("display", "none");
				sp.html("En savoir plus ...");				
			}
		});
	},

	printIt : function(){
		var win = window.open(this.urls, "_blank");
		var self = this;
		setTimeout(function(){
			win.print();
			self.smallScreen.close();				
		}, 1000);
	},
	
	saveIt : function(url){
		var r = this._refh;
		r.attr("download", this.name);
		r[0].click();
		setTimeout(function() {
			r.removeAttr("download");
		}, 300);
	}	
}
AC.declare(AC.PrintBox2);

/** ******************************************************** */

AC.Screen = function(){}
AC.Screen._static = {
	_screen : null,
	
	current : null,

	html1 : "<div class='bar' id='bar'>"		
		+ "<div class='retour'>Retour Synthèse</div>"
		+ "<div class='help'>Aide</div>"
		+ "<div class='printBar' id='printBar'></div>"
		+ "<div class='annuler'>Annuler Saisies</div>"
		+ "<div class='valider'>Valider</div>"
		+ "</div>"
		
		+ "<div class='page' id='page'>"
		+ "<div class='titre large' id='title'></div>"
		+ "<div class='inner' id='inner'></div>"
		+ "<div class='filler'></div>"
		+ "</div>",
				
	html2 : "<div class='page' id='page'>"
		+ "<div class='titre large' id='title'></div>"
		+ "<div class='inner' id='inner'></div>"
		+ "<div class='filler'></div>"
		+ "</div>",

}
AC.Screen._proto = {
	className : "Screen",
	
	init : function(caller, _embed) {
		this._embed = _embed;
		this.caller = caller;
		
		if (_embed){
			_embed.html(AC.Screen.html2);
			this._title = _embed.find("#title");
			this._content = _embed.find("#inner");
			this.display();
			return this;
		}
		
		if (this.caller && this.caller.showSubView)
			this.caller.showSubView(this);
		if (!AC.Screen._screen)
			AC.Screen._screen = $("#screen");
		AC.Screen._screen.html(AC.Screen.html1);
		this._title = AC.Screen._screen.find("#title");
		this._content = AC.Screen._screen.find("#inner");
		this._page = AC.Screen._screen.find("#page");
		this._bar = AC.Screen._screen.find("#bar");
		this._printBar = AC.Screen._screen.find("#printBar");
		this._retour = this._bar.find(".retour");
		this._help = this._bar.find(".help");
		this._valider = this._bar.find(".valider");
		this._annuler = this._bar.find(".annuler");
		AC.oncl(this, this._retour, this.retour);
		AC.oncl(this, this._help, this.help);
		AC.oncl(this, this._valider, this.enregistrer);
		AC.oncl(this, this._annuler, this.annuler);

		this.display();
				
		AC.Screen.current = this;
		var self = this;
		setTimeout(function(){
			APP._maskB.css("display", "block");
			APP._maskB.css("z-index", "49");
			APP.oncl(self, APP._maskB, self.retour);
			AC.Screen._screen.css("left", "10%");
		}, 10);
		new AC.PrintBox2().init(this._printBar, this._page);
		return this;
	},

	regDetail : function() {
		this._content.find(".detail").css("display", AC.ac2.detail ? "block" : "none");
		this._content.find(".detailTR").css("display", AC.ac2.detail ? "table-row" : "none");
		this._content.find(".ildetail").css("display", AC.ac2.detail ? "inline-block" : "none");
		var self = this;
		new AC.CheckBox2(this, "detail", "Vue détaillée");
		this._detail.val(AC.ac2.detail);
		this._detail.jqCont.off("dataentry").on("dataentry", function(){
			AC.ac2.detail = self._detail.val();
			self._content.find(".detail").css("display", AC.ac2.detail ? "block" : "none");
			self._content.find(".ildetail").css("display", AC.ac2.detail ? "inline-block" : "none");
			self._content.find(".detailTR").css("display", AC.ac2.detail ? "table-row" : "none");
		});
	},
	
	help : function(){
		AC.Help.gotoHelp(this.className);
	},
	
	paintTitle : function() {
		return "Titre";
	},
	
	paintContent : function() {
		return "Contenu";
	},

	setRO : function(){
		this._valider.css("display", "none");
		this._annuler.css("display", "none");
	},
	
	register : function(){
	},
	
	compile : function(){
	},
	
	display : function() {
		this.compile();
		this._title.html(this.paintTitle());
		this._content.html(this.paintContent());
		this.register();
	},
	
	redisplay : function() {
		this._title.html(this.paintTitle());
		this._content.html(this.paintContent());
		this.register();
	},	
	
	retour : function(){
		if (this.enEdition()) {
			if (window.confirm("Des saisies NON validées sont en cours.\n"
					+ "Voulez-vous vraiement revenir à la page de synthèse et les perdre ?"))
				this.close();
		} else
			this.close();
	},
	
	annuler : function(){
		if (window.confirm("Voulez-vous vraiement annuler toutes les saisies effectuées ?"))
			this.undo();
	},
	
	enEdition : function() {
		return false;
	},
	
	enErreur : function() {
		return false;
	},
	
	undo : function(){
	},
	
	enregistrer : function() {
	},
	
	enable : function(){
		if (this._embed) 
			return;
		var ed = this.enEdition();
		Util.btnEnable(this._valider, ed && !this.enErreur());
		Util.btnEnable(this._annuler, ed);
	},
		
	close : function() {
		if (this._embed) 
			return;
		setTimeout(function(){
			APP._maskB.css("display", "none");
			APP._maskB.css("z-index", "200");
			AC.Screen._screen.css("left", "110%");
			setTimeout(function(){
				AC.Screen._screen.html("");
			}, 300);
		}, 10);
		if (!this._embed) {
			AC.Screen.current = null;
			if (this.caller && this.caller.hideSubView)
				this.caller.hideSubView(this);
		}
	},

}
AC.declare(AC.Screen);

/** ******************************************************** */
$.Class("AC.Cell", {
cells : {}, 
mostRecentVersion : 0,

targetNode : function(target){
	var s = target.attr("data-index");
	if (!s)
		return null;
	var i = s.indexOf("@");
	var k = i == -1 ? s : s.substring(0, i);
	var c = AC.Cell.cells[k];
	if (i == -1 || i == s.length -1)
		return c;
	var s = s.substring(i+1);
	if (!c)
		return null;
	return c.get(s);
},

listAll : function() {
	var t = [];
	var dx = new Date();
	t.push(dx.stdFormat() + "\n");
	var now = Math.floor(dx.getTime() / 1000);
	for ( var n in this.cells) {
		var c = this.cells[n];
		var fx = c.fixed ? "/fixed" : "";
		if (c.pages.length != 0) {
			t.push("Cell" + fx + " : " + n + " Ref by " + c.pages.length + " pages. ");
			for ( var i = 0, p = null; p = c.pages[i]; i++) {
				if (!p.nom && !p.name)
					t.push("??? ");
				else
					t.push((p.nom ? p.nom : p.name) + " ");
			}
			t.push("\n");
		} else {
			var x = now - Math.floor(c.lastDetach / 1000);
			t.push("Cell" + fx + " : " + n + " Detach " + x + "s\n");
		}
	}
	if (AC.dbg){
		AC.debug("Cells >>>>>>>>>>");
		AC.debug(t.join(""));
		AC.debug("<<<<<<<<<< Cells");
	}
},

cleanupFiltered : function(types) {
	if (types && types.length != 0)
		for ( var n in AC.Cell.cells) {
			var c = AC.Cell.cells[n];
			for(var i = 0, t = null; t = types[i]; i++) {
				if (t == c.nent) {
					c.remove();
					break;
				}
			}
		}
},

cleanup : function() {
	var now = Math.floor(AC.AMJ.sysTime() / 1000);
	var t = [];
	for ( var n in AC.Cell.cells) {
		var c = AC.Cell.cells[n];
		if (c.lastDetach && !c.fixed) {
			var x = now - Math.floor(c.lastDetach / 1000);
			if (x > APP.cleanupTO2)
				t.push(c);
		}
	}
	for ( var i = 0, c = null; c = t[i]; i++)
		c.remove();
	if (AC.dbg)
		AC.Cell.listAll();
	if (APP.Ctx.cal) { // Notification des changements de statut, temps qui passe
		var changed = APP.Ctx.cal.calculAllDates();
		if (changed){
			for (var k = 0, p = null; p = APP.Ctx.cal.pages[k]; k++){
				if (p.onCellsChange)
					p.onCellsChange(APP.Ctx.cal);
			}
		}
	}
	setTimeout(AC.Cell.cleanup, APP.cleanupTO);
},

get : function(line, col, nent, selId) { // ou (key)
	if (!col)
		return AC.Cell.cells[line];
	return AC.Cell.cells[nent + ":" + line + ":" + col + ":" + (selId ? selId : "A")];
},

getN : function(line, col, nent, selId) {
	var x = this.get(line, col, nent, selId);
	if (!x)
		x = new AC[nent](line, col, false, selId);
	return x;
},

getAll : function() {
	var lst = [];
	for ( var n in AC.Cell.cells)
		lst.push(AC.Cell.cells[n]);
	return lst;
},

hasNeverSynchedCells : function() {
	for ( var n in AC.Cell.cells)
		if (AC.Cell.cells[n].version == -2)
			return true;
	return false;
},

buildSync : function() {
	var sync = [];
	var cells = [];
	for (var n in AC.Cell.cells) {
		var c = AC.Cell.cells[n];
		sync.push(c.syncItem());
		cells.push(c);
	}
	return {sync:sync, cells:cells};
},

mostRecentChange : function() {
	return AC.Cell.mostRecentVersion;
},

update : function(data, cells) {
	var lst = [];
	var todo = [];
	if (data) {
		if (data.sync && data.sync.length != 0) {
			for ( var i = 0, x = null; x = data.sync[i]; i++) {
				var k = x.t + ":" + x.l + ":" + x.c + ":" + x.s;
				var cell = AC.Cell.cells[k];
				if (cell == null)
					continue;
				var j = cells.indexOf(cell);
				if (j != -1)
					cells.splice(j, 1);
				if (!x.version) {
					cell.version = 0;
				} else {
					cell.version = x.version;
					if (x.version == -1) {
						cell.deleted = true;
					} else {
						if (x.data) {
							cell.dataTemp = x.data;
							todo.push(cell)
						}
					}
				}
			}
		}
	}

	for(var i = 0, cell = null; cell = cells[i]; i++){
		if (cell.version == -2)
			cell.version = -1;
	}
	
	var pages = [];
	for ( var j = 0, cell = null; cell = todo[j]; j++) {
		if (AC.dbg)
			AC.debug("Update cell:" + cell.key + "  version:" + cell.version);
		if (cell.dataTemp) {
			cell.updateNodes(cell.dataTemp);
			cell.dataTemp = null;
		}
		for ( var k = 0, p = null; p = cell.pages[k]; k++)
			if (pages.indexOf(p) == -1)
				pages.push(p);
	}

	for ( var k = 0, p = null; p = pages[k]; k++) {
		var cells = [];
		var keys = [];
		for ( var j = 0, cell = null; cell = todo[j]; j++) {
			if (cell.hasPage(p)) {
				if (cells.indexOf(cell) == -1){
					cells.push(cell);
					keys.push(cell.key);
				}
			}
		}
		if (cells.length == 0)
			continue;
		var f = p.onCellsChange;
		if (f) {
			if (AC.dbg) {
				var n = p.nom ? p.nom : (p.name ? p.name : (p.className ? p.className : "Classe sans nom"));
				AC.debug("Notify change of [" + keys.join(" ") + "] to " + n);
			}
			f.call(p, cells);
		}
	}

	AC.Cell.mostRecentVersion = 0;
	for ( var n in AC.Cell.cells) {
		var e = AC.Cell.cells[n];
		if (AC.Cell.mostRecentVersion < e.version)
			AC.Cell.mostRecentVersion = e.version;
	}

	return lst;
}

}, {

	init : function(line, col, nent, unregistered, selId) {
		this.filterKey = null;
		this.pages = [];
		this.line = line;
		this.col = col;
		this.nent = nent;
		this.selId = selId ? "" + selId : "A";
		this.version = -2;
		this.deleted = false;
		this.data = null;
		this.key = nent + ":" + line + ":" + col + ":" + this.selId;
		this.name = "Cell_" + this.key;
		if (!unregistered) {
			AC.Cell.cells[this.key] = this;
			this.lastDetach = AC.AMJ.sysTime();
			this.fixed = false;
		} else {
			this.fixed = true;
		}
	},

	syncItem : function() {
		return {l : this.line, c : this.col, t : this.nent, s : this.selId, version : this.version,
			filterKeys : this.filterKeys ? this.filterKeys : ['**'], filterArg : this.filterArg ? this.filterArg : ""}
	},

	updateNodes : function(nodes) {},

	remove : function() {
		for ( var i in AC.Cell.cells) {
			var x = AC.Cell.cells[i];
			if (x == this) {
				delete AC.Cell.cells[i];
			}
		}
	},

	hasPage : function(page) {
		if (page == null)
			return false;
		return this.pages.indexOf(page) != -1;
	},

	attach : function(page) {
		if (!this.hasPage(page))
			this.pages.push(page);
		this.lastDetach = 0;
	},

	detach : function(page) {
		if (page == null || this.pages.length == 0)
			return;
		var i = this.pages.indexOf(page);
		if (i != -1)
			this.pages.splice(i, 1);
		if (this.pages.length == 0) {
			this.lastDetach = AC.AMJ.sysTime();
		}
	}

});

/** **************************************************************** */
AC.Cell("AC.Directory", {
	letters : ["D", "C", "P"],

	get : function(code) {
		return this._super("D", "" + code + ".", "Directory");
	},
	
	getN : function(code) {
		var x = this.get(code);
		if (!x)
			x = new AC.Directory(code);
		return x;
	},
	
	allCells : [],
	
	attach : function(obj){
		for(var i = 0, c = null; c = this.allCells[i]; i++)
			c.attach(obj);
	},
	
	detach : function(obj){
		for(var i = 0, c = null; c = this.allCells[i]; i++)
			c.detach(obj);
	}

}, {

	init : function(code) {
		this.className = "Directory";
		AC.Directory.allCells.push(this);
		this.code = code ;
		this._super("D", "" + code + ".", "Directory");
		this.filterKeys = ['*+C'];
		if (!AC.Directory.elts) {
			AC.Directory.elts = [{},{},{}];
			AC.Directory.sortedElts = [[],[],[]];
		}
	},

	getElements : function(type) {
		return AC.Directory.sortedElts[type];
	},
	
	getOfInitiales : function(type, init){
		var elts = AC.Directory.elts[type];
		for(var x in elts)
			if (x.initiales == init)
				return x;
			else
				continue;
		return null;
	},
	
	getOfLabel : function(type, label){
		var elts = AC.Directory.elts[type];
		for(var x in elts)
			if (x.label == label)
				return x;
			else
				continue;
		return null;
	},
	
	decor : function(type, defaut, filter, html) {
		var decor = [];
		APP.colorPaire = true;
		if (defaut)
			decor.push({code : 0, label : defaut, html:html});
		var lst = AC.Directory.sortedElts[type];
		if (lst && lst.length != 0) {
			for ( var i = 0, x = null; x = lst[i]; i++)
				if (!filter || filter(x)){
					if (!html)
						decor.push({code : x.code, label : x.ls});
					else {
						var l = "<div class='acdd-itemValue color-" + (i % 2) + "'>" +
							Util.editEltHS(x) + "</div>";
						decor.push({code : x.code, label : l, html:html, text : x.ls});
					}
				}
		}
		return decor;
	},
	
	getElement : function(type, code, forced) {
		var x = AC.Directory.elts[type][code];
		if (x || !forced)
			return x;
		var l = "#" + code;
		return {code: code, initiales: l, label: l, suppr : 0, l : l , ls : l , color : 0};
	},

	updateNodes : function(nodes) {
		if (nodes && nodes.Entry) {
			var touch = {}
			for (var i = 0, x = null; x = nodes.Entry[i]; i++) {
				if (x.suppr && x.suppr < AC.AMJ.premierJour)
					continue;
				if (!x.type)
					x.type = 0;
				if (!x.code)
					x.code = 0;
				if (x.type < 0 || x.type > 3)
					continue;
				touch[x.type] = true;
				var y = AC.Directory.elts[x.type][x.code];
				if (!y) {
					y = {type:x.type, code:x.code, dirs:[], initiales:"", label:""};
					AC.Directory.elts[x.type][x.code] = y;
				}
				if (x.removed) {
					var ix = x.dirs.indexOf(this.code);
					if (ix != -1)
						x.dirs.splice(ix, 1);
					if (!y.initiales)
						y.initiales = x.initiales;
					if (!y.label)
						y.label = x.label;
					y.removed = x.removed;
				} else {
					y.label = x.label;
					y.initiales = x.initiales;
					y.suppr = x.suppr ? x.suppr : 0;
					y.pwd = x.pwd ? true : false;
					y.pwd2 = x.pwd2 ? true : false;
					y.postit = x.postit ? x.postit : "";
					y.mailer = x.mailer ? x.mailer : "";
					y.dirmail = x.dirmail ? x.dirmail : 0;
					if (x.dirs)
						y.dirs = x.dirs;
					y.jourmail = x.jourmail ? x.jourmail : 0;
					y.color = x.couleur ? x.couleur : x.code % APP.colors.length;
					y.l = y.initiales + " - " + y.label;
					y.ls = y.initiales + " - " + y.label + (x.suppr ? Util.editSuppr(x.suppr) : "");
				}
			}
			for(var ty in touch){
				var type = parseInt(ty, 10);
				var t = [];
				var l = AC.Directory.elts[ty];
				for(var x in l) {
					var c = l[x];
					if (type != 0 && c.removed){
						for(var i = 0; i < c.dirs.length; i++) {
							var d = c.dirs[i];
							if (APP.Ctx.myDirs.indexOf(d) != -1)
								c.removed = 0;
						}
					}
					t.push(c);
				}
				t.sort(AC.Sort.i);
				AC.Directory.sortedElts[ty] = t;
			}
		}
	}

});

/** **************************************************************** */
AC.Cell("AC.Tweets", {

line : function(gap) {
	return "P." + gap + ".";
},

column : function() {
	return "0."
},

get : function(gap, livr) {
	return this._super(this.line(gap), this.column(), "Tweets", livr);
},

getN : function(gap, livr) {
	var x = this.get(gap, livr);
	if (!x)
		x = new AC.Tweets(gap, livr);
	return x;
},

edt : function(t, twx){
	var n = twx.nbTwb + twx.nbTwr;
	if (n == 0)
		t.append("<div class='italic acSpace05'>Aucune nouvelle</div>");
	else {
		t.append("<div class='bold italic acSpace05 " + (twx.nbTwr ? "red" : "") + "'>");
		t.append("" + n + " nouvelle" + (n > 1 ? "s" : ""));
		if (twx.nbTwr){
			t.append(" dont " + twx.nbTwr + " importante" + (twx.nbTwr > 1 ? "s" : "") + "</div>");
			t.append("<div class='red'>");
			t.append(twx.twr.join("<br>"));
			t.append("</div>");
		} else {
			t.append("</div>");
		}
	}
}

}, {
	//
	init : function(gap, livr) {
		this.gap = gap;
		this.livr = livr;
		this.filterKeys = ['*+L.' + livr + "."];
		this._super(this.constructor.line(gap), this.constructor.column(), "Tweets", null, livr);
	},

	updateNodes : function(nodes) {
		if (!nodes)
			return;
		if (nodes.Tweet) {
			if (!this.data)
				this.data = {tweets : {}};
			for ( var i = 0, t = null; t = nodes.Tweet[i]; i++) {
				if (!t.texte) {
					delete this.data.tweets[t.numero];
				} else {
					var t2 = {numero : t.numero, gac : t.gac, ac : t.ac, texte : t.texte, version : t.version}
					var f = t.flags;
					if (t.flags % 10 == 1)
						t2.urgence = true;
					f = Math.floor(t.flags / 10);
					if (f % 10 == 1)
						t2.cibleAc = true;
					f = Math.floor(f / 10);
					if (f % 10 == 1)
						t2.ciblePr = true;
					f = Math.floor(f / 10);
					if (f % 10 == 1)
						t2.origineGac = true;
					this.data.tweets[t.numero] = t2;
				}
			}
		}
	},

	getActualTweets : function(gac) {
		var tweets = [];
		var alltweets = this.getTweets();
		for ( var i = 0, tw = null; tw = alltweets[i]; i++) {
			if (APP.Ctx.currentMode == 1) {
				if (tw.ciblePr)
					tweets.push(tw);
			} else if (APP.Ctx.currentMode == 2) {
				if (!tw.gac || (tw.gac && gac && tw.gac == gac))
					tweets.push(tw);
			} else {
				if ((gac && tw.gac && tw.ac && tw.gac == gac && tw.ac == APP.Ctx.authAc) // moi
					|| (tw.cibleAc && (!tw.gac || (gac && tw.gac && tw.gac == gac)))) // mon groupe
					tweets.push(tw);
			}
		}
		return tweets;
	},

	getNbTweets : function(gac) {
		var d = APP.Ctx.dir.getElement(2, this.gap);
		var init = d ? d.initiales : "#" + this.gap;
		var b = 0;
		var r = 0;
		var t = []
		var alltweets = this.getTweets();
		for ( var i = 0, tw = null; tw = alltweets[i]; i++) {
			if (APP.Ctx.currentMode == 1) {
				if (!tw.ciblePr)
					continue;
			} else if (APP.Ctx.currentMode == 2) {
				var x = !tw.gac || (tw.gac && gac && tw.gac == gac);
				if (!x)
					continue;
			} else {
				var x = ((gac && tw.gac && tw.ac && tw.gac == gac && tw.ac == APP.Ctx.authAc) // moi
					|| (tw.cibleAc && (!tw.gac || (gac && tw.gac && tw.gac == gac)))); // mon groupe
				if (!x)
					continue;
			}
			if (tw.urgence) {
				r++;
				t.push("[" + init + "] - " + tw.texte.escapeHTML());
			} else
				b++;
		}
		return {black:b, red:r, tw:t.join("<br>")};
	},

	getTweets : function() {
		var t = [];
		if (this.data && this.data.tweets) {
			for ( var i in this.data.tweets)
				t.push(this.data.tweets[i]);
		}
		t.reverse();
		return t;
	},

	displayTw2 : function(t, tweets, gac) {
		if (this.version == -1) {
			t.append("<div class='italic'>Chargement en cours ...</div>");
			return;
		}
		var elt = APP.Ctx.dir.getElement(2, this.gap);
		var titweet = (!tweets || tweets.length == 0) ? " - Pas de nouvelle" 
				: (tweets.length == 1 ? " - 1 nouvelle" : " - " + tweets.length + " nouvelles");
		
		t.append("<div class='acSpace1 acTW1 bold color" + (elt ? elt.color : 0) + "'>");
		t.append("<div class='acsLnkP btn' " + AC.encodeParam({gap:this.gap}) + ">Ajouter une nouvelle</div>");
		var x = gac ? Util.editEltH(elt) : "Livraison : " + this.livr;
		t.append("<div class='acsIL'>" + x + "</div>")
		t.append("<div class='acsIL'>" + titweet + "</div>");
		t.append("</div>")
		
		for ( var i = 0, tw = null; tw = tweets[i]; i++) {
			var del = false;
			if (APP.Ctx.currentMode == 1) {
				if (!tw.origineGac)
					del = true;
			} else if (APP.Ctx.currentMode == 2) {
				if (tw.origineGac && gac && gac == tw.gac)
					del = true;
			} else {
				if (tw.origineGac && gac && gac == tw.gac && tw.ac == APP.Ctx.authAc)
					del = true;
			}
			var st = tw.urgence ? "red" : "black";
			t.append("<div class='ac-tweet'>");
			if (del)
				t.append("<div class='acsLnkM btn' " 
					+ AC.encodeParam({gap:this.gap, msg:tw.numero}) + ">Effacer</div>");
			t.append("<div style='padding-left:1rem;color:" + st + "'>");
			t.append("<span class='small italic'>Nouvelle datée du "
					+ new Date(tw.version).format("Y-m-d H:i:s") + "</span>");
			var d1 = APP.Ctx.dir.getElement(1, tw.gac);
			var nomTGac = d1 ? d1.ls : "#" + tw.gac;
			var d2 = APP.Ctx.dir.getElement(2, this.gap);
			var nomGap = d2 ? d2.label.escapeHTML() : "#" + this.gap;
			if (!tw.origineGac) {
				t.append("<span class='small italic'> - Emise par le groupement <b>" + nomGap + "</b></span>");
			} else {
				if (!tw.ac) {
					t.append("<span class='small italic'> - Emise par le groupe <b>" + nomTGac + "</b></span>");
				} else {
					if (APP.Ctx.loginGac && (tw.gac == APP.Ctx.loginGac.code))
						t.append("<span class='small italic'> - Emise par l'alterconso <b>"
								+ APP.Ctx.loginGac.getNomS(tw.ac) + "</b> du groupe <b>" + nomTGac + "</b></span>");
					else
						t.append("<span class='small italic'> - Emise par un alterconso du groupe <b>" + nomTGac
								+ "</b></span>");
				}
			}
			t.append("<div class='small italic'>Destinataires : ");
			var aa = tw.cibleAc ? "animateurs et alterconsos" : "animateurs";
			if (!tw.origineGac && !tw.gac)
				t.append(aa + " des groupes ");
			else
				t.append(aa + " du groupe <b>" + nomTGac + "</b>");
			if (tw.ciblePr)
				t.append(" et producteurs du groupement <b>" + nomGap + "</b>");
			t.append("</div>");
			t.append("</div>");
			t.append("<div style='margin-top:0.3rem;color:" + st + "'>");
			if (tw.texte)
				t.append(tw.texte.escapeHTML() + "</div>");
			else
				t.append("(effacé)</div>");
			t.append("</div>");
		}
	}

});

/** **************************************************************** */
AC.Cell("AC.Catalogue", {

	line : function(gap) {
		return "P." + gap + ".";
	},
	
	get : function(gap) {
		return this._super(this.line(gap), "0.", "Catalogue");
	},
	
	getN : function(gap) {
		var x = this.get(gap);
		if (!x)
			x = new AC.Catalogue(gap);
		return x;
	}

}, {
	
	init : function(gap) {
		this.gap = gap;
		this.filterKeys = ['*+P', '*+M', '*+X'];
		this._super(this.constructor.line(gap), "0.", "Catalogue");
		this.decorBio = [{code:0, label:"inconnu"}];
		this.decorCond = [{code:0, label:"inconnu"}];
		this.data = {lstAp : {}, lstPr : {}, lstRy : {}}
	},

	tous : function(masque){
		var res = [];
		for (var idx in this.data.lstPr) {
			var x = this.data.lstPr[idx];
			if (!x.suppr || !masque)
				res.push(x);
		}
		return res;
	},

	rayons : function(i, masque){
		if (!this.data || !this.data.lstRy[i])
			return [];
		else
			if (!masque)
				return this.data.lstRy[i];
		var res = [];
		for ( var j = 0, x = null; x = this.data.lstRy[i][j]; j++) {
			if (!x.suppr)
				res.push(x);
		}
		return res;
	},
	
	buildappr : function(ap, pr, codeLivr) {
		var lstAp = this.data.lstAp[ap];
		if (!lstAp) {
			this.data.lstAp[ap] = [];
			lstAp = this.data.lstAp[ap];
		}
		if (lstAp.indexOf(pr) == -1)
			lstAp.push(pr);
		var idx = "" + ap + "." + pr;
		var lstPr = this.data.lstPr[idx];
		if (!lstPr) {
			this.data.lstPr[idx] = {prix : {}, pr : pr, ap : ap, prod:(ap * 10000) + pr};
			lstPr = this.data.lstPr[idx];
		}
		if (codeLivr < 0)
			return lstPr;
		var prix = lstPr.prix[codeLivr];
		if (!prix) {
			lstPr.prix[codeLivr] = {codeLivr : codeLivr}
			prix = lstPr.prix[codeLivr];
		}
		return prix;
	},

	get : function(prod){
		var idx = "" + Math.floor(prod / 10000) + "." + (prod % 10000);
		return this.data.lstPr[idx];
	},
	
	buildDecors : function(){
		this.decorBio = [{code:0, label:"inconnu"}];
		this.decorCond = [{code:0, label:"inconnu"}];
		var bios = {};
		var conds = {};
		var ibio = 0;
		var icond = 0;
		for(var pr in this.data.lstPr){
			var x = this.data.lstPr[pr];
			if (x.cond && ! conds[x.cond]){
				conds[x.cond] = true;
				icond++;
				this.decorCond.push({code:icond, label:x.cond});
			}
			if (x.bio && ! bios[x.bio]){
				bios[x.bio] = true;
				ibio++;
				this.decorBio.push({code:ibio, label:x.bio});
			}
		}
		this.decorBio.sort(AC.Sort.cl);
		this.decorCond.sort(AC.Sort.cl);
	},
	
	updateNodes : function(nodes) {
		if (!nodes)
			return;
		if (nodes.Produit) {
			for ( var i = 0, c = null; c = nodes.Produit[i]; i++) {
				var lstPr = this.buildappr(Math.floor(c.prod / 10000), c.prod % 10000, -1);
				lstPr.type = c.prod % 10;
				lstPr.rayon = (Math.floor(c.prod / 10)) % 10;
				lstPr.suppr = c.suppr;
				lstPr.nom = c.nom ? c.nom : "";
				lstPr.poidsemb = c.poidsemb ? c.poidsemb : 0;
				lstPr.froid = c.froid ? true : false;
				lstPr.parDemi = c.parDemi ? true : false;
				lstPr.postit = c.postit ? c.postit : "";
				lstPr.cond = c.cond ? c.cond.trim() : "";
				lstPr.bio = c.bio ? c.bio.trim() : "";
				if (!this.data.lstRy[lstPr.rayon])
					this.data.lstRy[lstPr.rayon] = [];
				var rx = this.data.lstRy[lstPr.rayon];
				var found = false;
				for(var j = 0, prx = null; prx = rx[j]; j++){
					if (prx.pr == lstPr.pr && prx.ap == lstPr.ap) {
						rx[j] = lstPr;
						found = true;
					}
				}
				if (!found)
					rx.push(lstPr);
			}
			this.buildDecors();
		}
		if (nodes.Prix) {
			for ( var i = 0, c = null; c = nodes.Prix[i]; i++) {
				if (!c.codeLivr)
					c.codeLivr = 0;
				var ap = Math.floor(c.prod / 10000);
				var pr = c.prod % 10000;
				var lstPr = this.data.lstPr["" + ap + "." + pr];
				if (!lstPr) {
					console.log("!!!-Prix : " + ap + "." + pr);
					continue;
				}
				var prix = this.buildappr(ap, pr, c.codeLivr);
				var pd = this.get(c.prod);
				prix.pu = c.pu ? c.pu : 0;
				if (pd.parDemi && pd.type == 1)
					prix.pu = prix.pu * 2;
				prix.poids = c.poids ? c.poids : 0;
				if (pd.parDemi)
					prix.poids = prix.poids * 2;
				prix.dispo = c.dispo ? c.dispo : 0;
				prix.qmax = c.qmax ? c.qmax : 0;
				if (pd.parDemi)
					prix.qmax = Math.round(prix.qmax / 2);
				prix.parite = c.parite ? c.parite : 0;
				prix.dhChange = c.dhChange ? new Date(c.dhChange).format("Y-m-d H:i") : "";
			}
		}
		if (nodes.Excl) {
			for ( var i = 0, c = null; c = nodes.Excl[i]; i++) {
				if (!c.codeLivr)
					c.codeLivr = 0;
				var ap = Math.floor(c.prod / 10000);
				var pr = c.prod % 10000;
				var lstPr = this.data.lstPr["" + ap + "." + pr];
				if (!lstPr) {
					console.log("!!!-Excl : " + ap + "." + pr);
					continue;
				}
				var prix = this.buildappr(ap, pr, c.codeLivr);
				if (c.gacs && c.gacs.length > 1)
					c.gacs.sort(AC.Sort.num);
				prix.gacExcl = c.gacs;
			}
		}
	},

	hasNom : function(ap, pr, nom) {
		if (this.data && this.data.lstPr) {
			for ( var p in this.data.lstPr) {
				var px = this.data.lstPr[p];
				if (px.nom != nom || px.ap != ap)
					continue;
				if (px.pr != pr || !pr)
					return p;
			}
		}
		return null;
	},

	produitDeNom : function(ap, nom) {
		if (this.data && this.data.lstPr) {
			for ( var p in this.data.lstPr) {
				var px = this.data.lstPr[p];
				if (px.nom == nom && px.ap == ap)
					return px.pr;
			}
		}
		return 0;
	},

	newPrCode : function(ap, type, rayon) {
		var r = rayon && rayon >= 0 && rayon <= 4 ? rayon : 0;
		var t = type && type > 0 && type <= 3 ? type : 1;
		var k = (r * 10) + t;
		var last = 0;
		if (this.data && this.data.lstPr) {
			for ( var p in this.data.lstPr) {
				var pr = this.data.lstPr[p];
				if (pr.ap != ap || (pr.type + (pr.rayon * 10) != k))
					continue;
				var l = Math.floor(pr.pr / 100);
				if (l > last)
					last = l;
			}
		}
		last++;
		if (last > 99)
			return -1;
		// return (last * 100) + k;
		return k;
	},

	isExcl : function(cv, gac){
		return gac && cv.gacExcl && cv.gacExcl.indexOf(gac) != -1;
	},
	
	getCtlgLivr : function(codeLivr, apx, gac, lstAps) {
		var r = {};
		for ( var apy in this.data.lstAp) {
			var ap = parseInt(apy, 10);
			if (lstAps && !lstAps[ap])
				continue;
			if (apx && ap != apx)
				continue;
			var prods = this.data.lstAp[ap];
			for ( var i = 0, pr = 0; pr = prods[i]; i++) {
				var pd = this.data.lstPr["" + ap + "." + pr];
				if (!pd)
					continue;
				var cv = pd.prix[codeLivr];
				if (!cv)
					continue;
				if (gac && this.isExcl(cv, gac))
					continue;
				if (!r[ap])
					r[ap] = [];
				r[ap].push({pd:pd, cv:cv});
			}
		}
		return r;
	},

	lstProduits : function(ap, masque){
		var lst = this.getProduits(ap);;
		var res = [];
		for ( var i = 0, pr = null; pr = lst[i]; i++) {
			var x = this.data.lstPr["" + ap + "." + pr];
			if (!x)
				continue;
			if (x.suppr && masque)
				continue;
			res.push(x);
		}
		return res;
	},

	lstProduits2 : function(ap){
		var lst = this.getProduits(ap);;
		var res = {};
		for ( var i = 0, pr = null; pr = lst[i]; i++) {
			var x = this.data.lstPr["" + ap + "." + pr];
			if (x)
				res[pr] = x;
		}
		return res;
	},
		
	setGacExclS : function(cv){
		if (cv.gacExcl) {
			var sb = new StringBuffer();
			for (var i = 0, gac = 0; gac = cv.gacExcl[i]; i++) {
				var d1 = APP.Ctx.dir.getElement(1, gac);
				sb.append(d1 ? d1.initiales : "#" + gac);
			}
			cv.gacExclS = sb.join(" ");
		} else
			cv.gacExclS = "";
	},
	
	cvEqual : function(a, b){
		return a.dispo == b.dispo && a.pu == b.pu && a.poids == b.poids && a.qmax == b.qmax
				&& a.parite == b.parite && a.dhChange == b.dhChange && a.gacExclS == b.gacExclS;
	},

	getListCVS2 : function(ap, pr){
		var res = {cvs:[], lvs:[]};
		res.cvs.push({dispo:0, pu:0, poids:0, qmax:0, parite:0, dhChange:0, gacExclS:""});
		if (!this.data || !this.data.lstPr)
			return res;
		var x = this.data.lstPr["" + ap + "." + pr];
		if (!x || !x.prix)
			return res;
		var clFound = {};
		var refFound = false;
		for (var lv in x.prix){
			var codeLivr = parseInt(lv, 10);
			var y = x.prix[lv];
			this.setGacExclS(y);
			var idx = -1;
			for(var i = 0, z = null; z = res.cvs[i]; i++){
				if (this.cvEqual(z, y)){
					idx = i;
					break;
				}
			}
			if (idx == -1) {
				idx = res.cvs.length;
				res.cvs.push(y);
			}
			if (codeLivr) {
				var livr = APP.Ctx.cal.getLivr(this.gap, codeLivr);
				if (!livr)
					continue;
				clFound[codeLivr] = true;
				res.lvs.push({codeLivr:codeLivr, icv: idx, expedition: livr.expedition,
						arch:livr.statut > 6, suppr: livr.suppr});
			} else {
				refFound = true;
				res.lvs.push({codeLivr:0, expedition:0, icv:idx});
			}
		}
		if (!refFound)
			res.lvs.push({codeLivr:0, expedition:0, icv:0});
		
		var allLv = APP.Ctx.cal.getAllLivrsGap(this.gap);
		for(var i = 0, livr = null; livr = allLv[i]; i++){
			var cl = livr.codeLivr;
			if (!clFound[cl] && livr.statut < 6)
				res.lvs.push({codeLivr: cl, expedition: livr.expedition, arch:false, 
					suppr: livr.suppr, icv:0 });
		}

		res.lvs.sort(function(a, b){
			if (a.codeLivr == 0)
				return -1;
			if (b.codeLivr == 0)
				return 1;
			if (a.arch && !b.arch)
				return 1;			
			if (!a.arch && b.arch)
				return -1;
			if (a.expedition < b.expedition)
				return -1;
			if (a.expedition > b.expedition)
				return 1;
			return 0;
		});
		return res;
	},

	getProduits : function(ap) {
		var lst = this.data && this.data.lstAp ? this.data.lstAp[ap] : null;
		return lst ? lst : [];
	},

	getProduit : function(ap, pr) {
		var pr = this.data && this.data.lstPr ? this.data.lstPr["" + ap + "." + pr] : null;
		return !pr ? null : pr;
	},

	getPrix : function(ap, pr, codeLivr) {
		var pr = this.data && this.data.lstPr ? this.data.lstPr["" + ap + "." + pr] : null;
		return !pr ? null : pr.prix[codeLivr];
	}

});

/** **************************************************************** */
AC.Cell("AC.GAPC", {

	regExp : new RegExp("[ \n,;]+", "g"),
	
	line : function(g) {
		return this.base + "." + g + ".";
	},
	
	get : function(g) {
		return this._super(this.line(g), "0.", this.baseName);
	},
	
	getN : function(g) {
		var x = this.get(g);
		if (!x)
			x = new AC[this.baseName](g);
		return x;
	}

}, {

	init : function(g) {
		this._super(this.constructor.line(g), "0.", this.constructor.baseName);
		this.code = g;
		this.isGAC = this.constructor.baseName == "GAC";
		this.contacts = {};
		this.entete = {groupements:[]};
		this.dirs = {indexes:[]};
		this.presence = {}
	},
	
	type : function(){
		return this.constructor.type;
	},
	
	monG : function() {
		return (this == APP.Ctx.loginGrp);
	},
	
	estMono : function(){
		var n = 0;
		for(var c in this.contacts){
			if (n == 1)
				return false;
			n++;
		}
		return true;
	},

	aPG : function(){
		for(var c in this.contacts){
			var ct = this.contacts[c];
			if (ct.code > 1 && ct.code < 100)
				return true;
		}
		return false;
	},

	aPD : function(){
		for(var c in this.contacts){
			var ct = this.contacts[c];
			if (ct.code >= 100)
				return true;
		}
		return false;
	},

	existAt : function(d){
		var x = {};
		for(var c in this.contacts){
			var ct = this.contacts[c];
			if (!ct.suppr || ct.suppr > d)
				x[ct.code] = true;
		}
		return x;
	},

	isSuppr : function(){
		var e = this.enumElt();
		return e ? e.suppr : true;
	},
	
	isMonAcAp : function(code) {
		if (!this.monG())
			return false;
		return this.isGAC ? (code == APP.Ctx.authAc) : (code == APP.Ctx.authAp);
	},
	
	sortedEltsFromSet : function(set){
		var r = []
		for (var x in set){
			var i = parseInt(x, 10);
			var elt = this.get(i);
			if (elt)
				r.push(elt);
		}
		r.sort(this.constructor.type == 1 ? AC.Sort.gac : AC.Sort.gap);
		return r;
	},
	
	wLvl : function(u){
		if (this != APP.Ctx.loginGrp || this.isSuppr())
			return 0;
		if (!APP.Ctx.authUsr)
			return APP.Ctx.authPower < 3 ? 3 : 0;
		if (u == APP.Ctx.authUsr){
			if (APP.Ctx.authPower < 3)
				return 3;
			if (APP.Ctx.authPower < 4)
				return 2;
			if (APP.Ctx.authPower == 4)
				return 1;
		}
		return 0;
	},
	
	rLvl : function(u){
		if (this != APP.Ctx.loginGrp)
			return 0;
		return APP.Ctx.authPower < 3 || u == APP.Ctx.authUsr ? 2 : 1;
	},
	
	getEmails : function(c){
		if (c)
			return this.getCEmails(c);
		var lst = []
		for (var c in this.contacts) {
			var s = this.getCEmails(c);
			if (s)
				lst.push(s);
		}
		return lst.join(",");
	},
	
	getCEmails : function(c){
		if (c){
			var elt = this.get(c);
			if (elt && elt.email1){
				return elt.email1.split(AC.GAPC.regExp).join(",");
			}
		}
		return "";
	},
	
	getNomS : function(code) {
		return Util.editEltH(this.getContact(code));
	},
	
	enumElt : function() {
		return APP.Ctx.dir.getElement(this.constructor.type, this.code);
	},
		
	updateNodes : function(nodes) {
		if (!nodes)
			return;
		if (nodes.Contact) {
			for (var i = 0, c = null; c = nodes.Contact[i]; i++){
				var x = this.contacts[c.code];
				if (!x) {
					this.contacts[c.code] = {code:c.code};
					x = this.contacts[c.code];
				}
				x.nom = c.nom ? c.nom : "X" + c.code;
				x.pwd = c.pwd ? c.pwd : false;
				x.nph = c.nph ? c.nph : 0;
				x.postitContact = c.postitContact ? c.postitContact : "";
				x.initiales = c.initiales ? c.initiales : "X" + c.code ;
				x.url = c.url ? c.url : "";
				x.adherent = c.adherent ? c.adherent : "";
				x.confidentialite = c.confidentialite ? c.confidentialite : 0;
				x.suppr = c.suppr ? c.suppr : 0;
				x.email1 = c.email1 ? c.email1 : "";
				x.telephones = c.telephones ? c.telephones : "";
				x.localisation = c.localisation ? c.localisation : "";
				x.ordreCheque = c.ordreCheque ? c.ordreCheque : x.nom;
				x.groupements = c.groupements ? c.groupements : [];
				x.grExcl = c.grExcl ? c.grExcl : [];
				x.derniereCotis = c.derniereCotis ? c.derniereCotis : "";
				x.dhi1 = c.dhi1 ? c.dhi1 : 0;
				x.color = c.couleur ? c.couleur : c.code % APP.colors.length;
				x.nomail = c.nomail ? c.nomail : 0;
				x.novol = c.novol ? c.novol : 0;
				x.unclic = c.unclic ? c.unclic : 0;
				x.aContacter = c.aContacter ? c.aContacter : 0;
				x.bienvenueS = c.bienvenueJ && c.bienvenueS ? c.bienvenueS : "";
				x.bienvenueT = c.bienvenueJ && c.bienvenueT ? c.bienvenueT : "";
				x.bienvenueJ = c.bienvenueJ ? c.bienvenueJ : 0;
				x.jsonData = c.jsonData ? c.jsonData : "";
			}
		}
		if (nodes.Entete)
			this.entete.groupements = nodes.Entete.groupements;
		if (nodes.DirIndex)
			this.dirs.indexes = nodes.DirIndex.indexes;
		if (this.isGAC && nodes.Presence){
			for (var i = 0, p = null; p = nodes.Presence[i]; i++){
				var x = this.presence[p.lundi];
				if (!x){
					this.presence[p.lundi] = [null, {},{},{},{},{},{},{}];
					x = this.presence[p.lundi];
				}
				x[p.jour].matin = p.matin;
				x[p.jour].apm = p.apm;
			}
		}
	},
	
	getPresence : function(lundi){
		var x = this.presence[lundi];
		if (!x)
			x = [null,{},{},{},{},{},{},{}];
		return x;
	},
	
	forAllContacts : function(doIt) {
		var lst = [];
		for (var c in this.contacts)
			lst.push(this.contacts[c]);
		lst.sort(AC.Sort.gac);
		for (var i = 0, c = null; c = lst[i]; i++)
			doIt(this.contacts[c.code]);
	},
	
	tauxPrelev : function(aammjj) {
		var res = {};
		for (var c in this.contacts) {
			var x = this.contacts[c];
			var s = x.derniereCotis;
			try {
				var y = s ? JSON.parse(s) : [];
			} catch (e) { var y = [];}
			var t = 0;
			for(var i = 0, z = null; z = y[i]; i++) {
				if (z.date <= aammjj)
					t = z.taux;
			}
			res[c] = t;
		}
		return res;
	},
	
	getAllContacts : function(){
		var lst = [];
		for (var c in this.contacts)
			lst.push(this.contacts[c]);
		if (this.isGAC){
			return lst.sort(AC.Sort.gac);
		} else {
			return lst.sort(AC.Sort.gap);		
		}
	},

	getDirsLabels : function() {
		var t = [];
		var elt = this.enumElt();
		if (elt == null)
			return t;
		for (var i = 0, x = null; x = elt.dirs[i]; i++) {
			var d = APP.Ctx.master.getElement(0, x);
			if (d)
				t.push(d.ls);
		}
		return t;
	},

	decor : function(defaut, filter, html) {
		var decor = [];
		if (defaut)
			decor.push({code : 0, label : defaut, html:html, tri:""});
		var lst = this.getAllContacts();
		if (lst && lst.length != 0) {
			APP.colorPaire = true;
			for ( var i = 0, x = null; x = lst[i]; i++) {
				var key = !filter ? x.initiales : filter(x);
				if (key){
					if (!html)
						decor.push({code : x.code, label : x.ls, tri:key});
					else {
						var l = "<div class='acdd-itemValue color" + APP.altc(x.color) + 
						" bold'>" + Util.editEltH(x) + "</div>";
						decor.push({code : x.code, label : l, html:html, text : x.ls, tri:key});
					}
				}
			}
		}
		decor.sort(AC.Sort.t);
		return decor;
	},

	getContacts : function() {
		var t = [];
		var lst = this.getAllContacts();
		for ( var i = 0, x = null; x = lst[i]; i++)
			t.push({code: x.code, elt:x, label : Util.editEltH(x), 
				suppr: x.suppr, oc : x.ordreCheque, initiales:x.initiales});
		t.sort(AC.Sort.gac);
		return t;
	},

	getContactOfId : function(id) {
		for ( var c in this.contacts) {
			var x = this.contacts[c];
			if (x.code === id)
				return x;
			if (x.initiales === id)
				return x;
			if (x.adherent === id)
				return x;
		}
		return null;
	},

	getContactOfInitiales : function(id) {
		for ( var c in this.contacts) {
			var x = this.contacts[c];
			if (x.initiales == id)
				return x;
		}
		return null;
	},

	getContactOfNom : function(id) {
		for ( var c in this.contacts) {
			var x = this.contacts[c];
			if (x.nom === id)
				return x;
		}
		return null;
	},

	codeDeNom : function(n){
		var elt = this.getContactOfNom(n);
		return elt ? elt.code : 0;
	},

	get : function(code) {
		return this.getContact(code);
	},

	getContact : function(code) {
		var x = this.contacts[code];
		return x ? x : {nom:"#" + code, initiales:"#" + code};
	},

	activerContact : function(code) {
		var elt = this.get(code);
		var del = elt.suppr;
		var arg = {op:del ? "24" : "23"};
		if (this.isGAC) {
			arg.gac = this.code;
		} else {
			arg.gap = this.code;
		}
		arg.code = code;
		arg.operation = del ? "Réactivation d'accès" : "Résiliation d'accès";
		AC.Req.post(this, "alterconsos", arg, del ? "Réactivation d'accès faite" : "Résiliation d'accès faite",
			del ? "Echec de la réactivation : " : "Echec de la résiliation : ");
	},
	
	genererCle : function(code) {
		var arg = {op:"25"};
		if (this.isGAC) {
			arg.gac = this.code;
		} else {
			arg.gap = this.code;
		}
		arg.code = code;
		arg.operation = "Génération d'une nouvelle clé d'accès";
		AC.Req.post(this, "alterconsos", arg, "Génération faite", "Echec de la génération : ");
	}

});

/** **************************************************************** */
AC.GAPC("AC.GAP", {
	elt : function(code){
		return APP.Ctx.dir.getElement(2, code, true);
	},
	base : "P", 
	type : 2, 
	baseName : "GAP"

}, {

	init : function(gap) {
		this._super(gap);
	}
});

/** **************************************************************** */
AC.GAPC("AC.GAC", {
	elt : function(code){
		return APP.Ctx.dir.getElement(1, code, true);
	},
	base : "C", 
	type : 1, 
	baseName : "GAC"
}, {
	init : function(gac) {
		this._super(gac);
	}
	
});

/** ******************************************************************* */
AC.Tournee = function(json){
	this.camions = [];
	this.optionGacs = {};
	if (json) {
		try {
			if (json.startsWith("[")) {
				this.camions = JSON.parse(json);
			} else {
				var obj = JSON.parse(json);
				this.camions = obj.camions;
				this.optionGacs = obj.optionGacs;
			}
		} catch (e) { }
	}
	if (this.camions.length == 0)
		this.camions.push({"nom":"camion 1"});
	this.gacs = {};
	for(var i = 0, c = null; c = this.camions[i]; i++){
		if (!c.gfs) {
			c.gfs = [{}, {}];
			if (c.gacs)
				for(var j = 0, gac = 0; gac = c.gacs[j]; j++){
					c.gfs[0][gac] = true;
					c.gfs[1][gac] = true;
				}
		}
		for(var fs = 0; fs < 2; fs++){
			var gacs = c.gfs[fs];
			for(var gac in gacs){
				var x = this.gacs[gac];
				if (!x) {
					this.gacs[gac] = [0, 0];
					x = this.gacs[gac];
				}
				x[fs] = i;
			}
		}
	}
}
AC.Tournee._static = {
}
AC.Tournee._proto = {
		
	isSingle : function(){
		return this.camions.length <= 1;
	},
	
	lstCamions : function(){
		var lst = []
		for(var i = 0, camion = null; camion = this.camions[i]; i++)
			lst.push({label:camion.nom, code:i});
		lst.sort(AC.Sort.l);
		return lst;
	},
		
	camion : function(c){
		if (c < 0 || c >= this.camions.length)
			c= 0;
		return this.camions[c];
	},

	camionDeNom : function(nom){
		for(var i = 0, x = null; x = this.camions[i]; i++)
			if (x.nom == nom)
				return x;
		return null;
	},

	iCamionDeNom : function(nom){
		for(var i = 0, x = null; x = this.camions[i]; i++)
			if (x.nom == nom)
				return i;
		return -1;
	},

	ajouterCamion : function(nom){
		if (this.camionDeNom(nom))
			return;
		this.camions.push({nom:nom, gfs:[{},{}]});
	},
	
	supprCamion : function(nom){
		var ic = -1;
		for(var i = 0, x = null; x = this.camions[i]; i++)
			if (x.nom == nom)
				ic = i; 
		if (ic == -1)
			return -1;
		var x = this.getGacs(ic);
		if (x.length != 0)
			return x.length;
		this.camions.splice(ic,1);
		return 0;
	},

	aCamion : function(c){
		return this.camions[c] ? true : false;
	},

	getGacs : function(ic){
		var c = this.camions[ic];
		if (!c)
			return [];
		var gacs = {}
		for(var fs = 0; fs < 2; fs++){
			for(var gac in c.gfs[fs])
				gacs[gac] = true;
		}
		var res = [];
		for(var gac in gacs)
			res.push(parseInt(gac));
		return res;
	},
	
	setNomCamion : function(c, nom){
		c.nom = nom;
	},
	
	gac : function(gac){
		var x = this.gacs[gac];
		if (!x) {
			this.gacs[gac] = [0, 0];
			x = this.gacs[gac];
			var c = this.camions[0];
			c.gfs[0][gac] = true;
			c.gfs[1][gac] = true;
		}
		return x;
	},
	
	setGac : function(gac, cm){
		var g = this.gac(gac);
		for(var fs = 0; fs < 2; fs++){
			ica = g[fs];
			icn = cm[fs];
			if (icn != ica){
				delete this.camion(ica).gfs[fs][gac];
				this.camion(icn).gfs[fs][gac] = true;
				g[fs] = cm[fs];
			}
		}
	},
	
	json : function(){
		var c = this.camions[0];
		var c0 = {nom:c.nom, gfs:[{}, {}]};
		var b = true;
		for(var gac in c.gfs[0]){
			if (!c.gfs[1][gac]) {
				c0.gfs[0][gac] = true;
				b = false;
			}
		}
		for(var gac in c.gfs[1]){
			if (!c.gfs[0][gac]) {
				c0.gfs[1][gac] = true;
				b = false;
			}
		}
		if (b)
			delete c0.gfs;
		var repart = [c0];
		for(var i = 1, c = null; c = this.camions[i]; i++)
			repart.push(c);
		return JSON.stringify({camions:repart, optionGacs:this.optionGacs});
	}
	
}
AC.declare(AC.Tournee);

/** ******************************************************************* */
AC.Cell("AC.Calendrier", {
	
	get : function(dir) {
		return this._super("D", "" + dir + ".", "Calendrier");
	},

	getN : function(dir) {
		var x = this.get(dir);
		if (x)
			return x;
		return new AC.Calendrier(dir);
	},
	
	allCells : [],
	
	attach : function(obj){
		for(var i = 0, c = null; c = this.allCells[i]; i++)
			c.attach(obj);
	},
	
	detach : function(obj){
		for(var i = 0, c = null; c = this.allCells[i]; i++)
			c.detach(obj);
	}

}, {
	
	init : function(dir) {
		this.className = "Calendrier";
		this.dir = dir;
		this._super("D", "" + dir + ".", "Calendrier");
		AC.Calendrier.allCells.push(this);
		if (!AC.Calendrier.livrs) {
			AC.Calendrier.livrs = {};
			AC.Calendrier.slivrs = {};
		}
		this.filterKeys = ['*+L'];
	},
	
	getLivr : function(gap, codeLivr) {
		return AC.Calendrier.livrs[gap + "_" + codeLivr];
	},

	getSlivr : function(gap, codeLivr, gac) {
		return AC.Calendrier.slivrs[gap + "_" + codeLivr + "_" + gac];
	},

	tournee : function(gap, codeLivr) {
		var livr = this.getLivr(gap, codeLivr);
		return !livr ? new AC.Tournee(null) : new AC.Tournee(livr.jsonData);
	},
	
	getAllLivrsGap : function(gap) {
		var res = [];
		for(var key in AC.Calendrier.livrs)
			if (key.startsWith(gap + "_"))
				res.push(AC.Calendrier.livrs[key]);
		return res;
	},
	
	getStatut : function(lx, jour) {
		var livr = lx.livr ? lx.livr : lx;
		var slivr = lx.livr ? lx : null;
		var now = AC.AMJ.getTime();
		var nowh = (AC.AMJ.aujourdhui * 100) + now.getHours();

		var com = livr.ouverture * 100;
		var hx = livr.hlimite;
		if (APP.Ctx.currentMode == 3 && slivr && slivr.hlimac)
			hx = hx > slivr.hlimac ? hx - slivr.hlimac : 1;
		var lim = (livr.limite * 100) + hx;
		var exp = livr.expedition * 100;
		var liv = !slivr ? 0 : (slivr.dlivr * 100) + (jour ? 0 : slivr.hlivr);
		var dis = !slivr ? 0 : (slivr.distrib * 100) + (jour ? 0 : slivr.hdistrib);
		var arc = livr.archive * 100;

		if (arc <= nowh)
			return 7; // en archive
		if (slivr) {
			if (dis <= nowh)
				return 6; // en distribution
			if (liv <= nowh)
				return 5; // en déchargement
		}
		if (exp < nowh)
			return 4; // en transport (en tous cas "parti")
		if (lim && lim <= nowh)
			return 3; // en chargement
		if (com && com < nowh)
			return 2; // ouverte à la commande
		return 1; // prévu
	},

	updateNodes : function(nodes) {
		if (!nodes || !nodes.Livr)
			return;
		var livrs = [];
		for ( var i = 0, node = null; node = nodes.Livr[i]; i++) {
			var key = node.gap + "_" + node.codeLivr;
			var livr = AC.Calendrier.livrs[key];
			if (!livr) {
				livr = {gap: node.gap, codeLivr: node.codeLivr, key: key, slivrs:{}};
				AC.Calendrier.livrs[key] = livr;
			}
			livrs.push(livr);
			if (!node.gac) {
				livr.suppr = node.suppr;
				livr.creation = node.creation;
				livr.jarchive = node.jarchive ? node.jarchive : 30;
				livr.jlimite = node.jlimite ? node.jlimite : 0;
				if (livr.jlimite > 100)
					livr.jlimite = 0;
				livr.hlimite = node.hlimite ? node.hlimite : 24;
				livr.jouverture = node.jouverture ? node.jouverture : 0;
				if (livr.jouverture > 365)
					livr.jouveerture = 0;
				livr.expedition = node.expedition;
				livr.dlu = Util.mondayOfaammjj(livr.expedition);
				livr.jsonData = node.jsonData;
			} else {
				var key2 = node.gap + "_" + node.codeLivr + "_" + node.gac;
				var slivr = AC.Calendrier.slivrs[key2];
				if (!slivr) {
					slivr = {gap:node.gap, codeLivr:node.codeLivr, gac:node.gac, key:key2, livr:livr};
					AC.Calendrier.slivrs[key2] = slivr;
					livr.slivrs[node.gac] = slivr;
				}
				slivr.adresseL = node.adresseL ? node.adresseL : "";
				slivr.adresseD = node.adresseD ? node.adresseD : "";				
				slivr.suppr = node.suppr;
				slivr.jlivr = node.jlivr ? node.jlivr : 0;
				slivr.hlivr = node.hlivr ? node.hlivr : 0;
				slivr.hlimac = node.hlimac ? node.hlimac : 0;
				slivr.hdistrib = node.hdistrib ? node.hdistrib : 0;
				slivr.fdistrib = node.fdistrib ? node.fdistrib : 23;
				slivr.jdistrib = node.jdistrib ? node.jdistrib : 0;
				slivr.reduc = node.reduc ? node.reduc : 0;
				slivr.fraisgap0 = node.fraisgap0 ? node.fraisgap0 : 0;
			}
		}
		this.calculDates(livrs);
	},

	calculAllDates : function(){
		var livrs = [];
		for(var key in AC.Calendrier.livrs)
			livrs.push(AC.Calendrier.livrs[key]);
		return this.calculDates(livrs);
	},
	
	calculDates : function(livrs){
		var changed = false;
		for(var i = 0, livr = null; livr = livrs[i]; i++){
			var _statut = livr.statut;
			livr.archive =AC.AMJ.jPlusN(livr.expedition, livr.jarchive);
			livr.limite =AC.AMJ.jPlusN(livr.expedition, -livr.jlimite);
			livr.ouverture =AC.AMJ.jPlusN(livr.limite, -livr.jouverture);
			
			livr.statut = this.getStatut(livr);
			livr.phase = AC.Context.phases[livr.statut];
			if (!changed)
				changed = _statut != livr.statut; 
			for(var g in livr.slivrs){
				slivr = livr.slivrs[g];
				var _statut = slivr.statut;
				this.setSlivr(slivr, livr.expedition);
				slivr.statut = this.getStatut(slivr);
				slivr.phase = AC.Context.phases[slivr.statut];	
				if (!changed)
					changed = _statut != slivr.statut; 
			}
		}
		return changed;
	},
	
	setSlivr : function(slivr, expedition) {
		if (slivr.jlivr >= 0)
			slivr.dlivr =AC.AMJ.jPlusN(expedition, slivr.jlivr);
		else {
			var jex = AC.AMJ.js(expedition);
			var jl = - slivr.jlivr;
			if (jl == jex)
				slivr.dlivr = expedition;
			else {
				if (jl > jex)
					slivr.dlivr =AC.AMJ.jPlusN(expedition, jl - jex);
				else
					slivr.dlivr =AC.AMJ.jPlusN(expedition, 7 + jl - jex);
			}
		}
		
		if (slivr.jdistrib >= 0)
			slivr.distrib =AC.AMJ.jPlusN(slivr.dlivr, slivr.jdistrib);
		else {
			var jl = AC.AMJ.js(slivr.dlivr);
			var jd = - slivr.jdistrib;
			if (jl == jd)
				slivr.distrib = slivr.dlivr;
			else {
				if (jd > jl)
					slivr.distrib =AC.AMJ.jPlusN(slivr.dlivr, jd - jl);
				else
					slivr.distrib =AC.AMJ.jPlusN(slivr.dlivr, 7 + jd - jl);
			}					
		}
	},
	
	getLivrsGAC : function(gac, dlu) {
		var res = [];
		for(var key in AC.Calendrier.slivrs) {
			if (!key.endsWith("_" + gac))
				continue;
			var slivr = AC.Calendrier.slivrs[key];
			if (slivr.livr.dlu == dlu && !slivr.suppr && !slivr.livr.suppr)
				res.push(slivr);
		}
		return res;
	},

	getLivrsGAC2 : function(gac) {
		var res = {dates : [], livr : {}};
		for(var key in AC.Calendrier.slivrs) {
			if (!key.endsWith("_" + gac))
				continue;
			var slivr = AC.Calendrier.slivrs[key];
			var d = APP.Ctx.authType == 2 ? slivr.livr.expedition : slivr.distrib;
			if (res.dates.indexOf(d) == -1) {
				res.dates.push(d);
				res.livr[d] = [];
			}
			res.livr[d].push(slivr.livr);
		}
		res.dates.sort(AC.Sort.num);
		return res;
	},

	getSlivrByGap2 : function(gac, date) {
		var r = {};
		for (var key in AC.Calendrier.slivrs) {
			if (!key.endsWith("_" + gac))
				continue;
			var slivr = AC.Calendrier.slivrs[key];
			if (slivr.distrib == date)
				r[slivr.gap] = slivr;
		}
		return r;
	},

	getLivrsGAP : function(gap, dlu) {
		var res = {dates : [], livr : {}};
		for (var key in AC.Calendrier.livrs) {
			if (!key.startsWith(gap + "_"))
				continue;
			var livr = AC.Calendrier.livrs[key];
			if (dlu && (livr.suppr || livr.dlu != dlu))
					continue;
			var d = livr.expedition;
			if (res.dates.indexOf(d) == -1) {
				res.dates.push(d);
				res.livr[d] = [];
			}
			res.livr[d].push(livr);
		}
		res.dates.sort(AC.Sort.num);
		return res;
	},
	
	decorLivrsGAP : function(gap, def, codeLivr, noref){
		var decor = [];
		decor.push({code:0, label:def, expedition:1});
		if (!noref)
			decor.push({code:999, label:"REFERENCE", expedition:2});
		for (var key in AC.Calendrier.livrs) {
			if (!key.startsWith(gap + "_"))
				continue;
			var livr = AC.Calendrier.livrs[key];
			if (codeLivr && livr.codeLivr == codeLivr)
				continue;
			decor.push({code:livr.codeLivr, expedition:livr.expedition,
				label:"[" + livr.codeLivr + "] - " + AC.AMJ.dateCourte(livr.expedition)});
		}
		decor.sort(AC.Sort.ex);
		return decor;
	},
	
	getLivrJourGAP : function(aammjj, g) {
		for (var key in AC.Calendrier.livrs) {
			if (!key.startsWith(g + "_"))
				continue;
			var livr = AC.Calendrier.livrs[key];
			if (livr.expedition == aammjj)
				return livr;
		}
		return null;
	}

});

/** **************************************************************** */
AC.Cell("AC.StatsMail", {
	line : function() {
		return "D";
	},

	column : function() {
		return "" + APP.Ctx.authDir + ".";
	},

	filtreOf : function() {
		return APP.Ctx.authType > 0 ? "A"+ APP.Ctx.authType + APP.Ctx.authGrp : "A";
	},

	get : function() {
		return this._super(this.line(), this.column(), "StatsMail", this.filtreOf());
	},
	
	getN : function() {
		var x = this.get();
		if (!x)
			x = new AC.StatsMail();
		return x;
	},
	
	libStatus : ["OK", "en&nbsp;cours", "erreur"],

},{
	init : function() {
		if (APP.Ctx.authType > 0) {
			this.type = APP.Ctx.authType;
			this.grp = APP.Ctx.authGrp;
			this.selId = "A" + this.type + this.grp;
		} else {
			this.type = 0;
			this.grp = 0;
			this.selId = "A";
		}
		this._super(this.constructor.line(), this.constructor.column(), "StatsMail", false, this.selId);
		if (APP.Ctx.authType > 0)
			this.filterKeys = ['**C.' + this.type + "." + this.grp + "."];
		else
			this.filterKeys = ['**C.'];
		this.stats = [];
	},
	
	updateNodes : function(nodes) {
	    if (nodes.Stat) {
	    	for (var i = 0, x = null; x = nodes.Stat[i]; i++){
	    		var j = this.stats.length;
	    		for (var k = 0, y = null; y = this.stats[k]; k++)
	    			if (y.type == x.type && y.grp == x.grp) {
	    				j = k;
	    				break;
	    			}
	    		if (j == this.stats.length)
	    			this.stats.push({type:x.type, grp:x.grp});
	    		var z = this.stats[j];
	    		z.lot = x.lot ? x.lot : "";
	    		z.status = x.status ? x.status : 0;
	    		z.startTime = x.startTime ? x.startTime : 0;;
	    		z.endTime = x.endTime ? x.endTime : 0;;
	    		z.cpts = x.cpts ? x.cpts : [0,0,0,0,0];
	    		z.statusText = x.statusText && x.status ? x.statusText : "";
	    		var e = APP.Ctx.dir.getElement(z.type, z.grp);
	    		z.initiales = e ? e.initiales : "";
	    		z.nom = e ? e.label : "";
	    	}
	    	this.stats.sort(AC.Sort.i);
	    }
	},
	
	edit : function(){
		var sb = new StringBuffer();
		sb.append("<div class='italic acSpace1'>Compteurs :<br>");
		sb.append("OK : messages envoyés normalement<br>");
		sb.append("B : messages NON envoyés : ne reçoit pas de synthèse hebdomadaire<br>");
		sb.append("C : messages NON envoyés : adresse(s) e-mail non valide<br>");
		sb.append("D : messages NON envoyés : synthèse vide (pas de commandes récentes / en cours)<br>");
		sb.append("Erreur : messages NON envoyés : refus d'envoi par le mailer<br><br></div>");
		var t = new AC.Table(9, true, false, ["s", 4, 0, 4, 0, 0, 0, 0, 0, 6]);
		t.clazz("inverse bold").row("Groupe / Groupement", "Lot", "OK en&nbsp;cours erreur",
				"Début<br>Fin", 
				"OK", "B", "C", "D", "Erreur", "Descr. erreur");
		for(var i = 0, x = null; x = this.stats[i]; i++){
			if (!x.initiales)
				continue;
			var r1 = x.initiales + " - " + x.nom;
			var r2 = this.constructor.libStatus[x.status];
			var r3 = x.startTime ? new Date(x.startTime).format("m-d H:i:s") : "";
			var r4 = x.endTime ? new Date(x.endTime).format("m-d H:i:s") : "";
			var rlot = x.lot;
			if (APP.Ctx.authType < 0 && x.status)
				rlot = "<a target='_blank' href='/cron/Hebdos2/" 
					+ APP.Ctx.authDir + "/" + x.lot + "'>relancer " + x.lot + "</a>";
			t.row(r1, rlot, r2, r3 + "<br>" + r4, x.cpts[0], x.cpts[1], x.cpts[2], x.cpts[3], x.cpts[4], x.statusText);
		}
		sb.append(t.flush());
		return sb.toString();
	}
	
});

/** **************************************************************** */
AC.Cell("AC.TraceMail", {
	line : function(type, grp) {
		if (APP.Ctx.authType > 0) {
			type = APP.Ctx.authType;
			grp = APP.Ctx.authGrp;
		}
		return (type == 1 ? "C." : "P.") + grp + ".";
	},

	column : function() {
		return "0.";
	},

	filtreOf : function(type, grp) {
		if (APP.Ctx.authType > 0) {
			type = APP.Ctx.authType;
			grp = APP.Ctx.authGrp;
		}
		return "A" + type + grp;
	},

	get : function(type, grp) {
		return this._super(this.line(type, grp), this.column(), "TraceMail", this.filtreOf(type, grp));
	},
	
	getN : function(type, grp) {
		var x = this.get(type, grp);
		if (!x)
			x = new AC.TraceMail(type, grp);
		return x;
	},
	
	libStatus : ["OK", "B", "C", "D", "Erreur"],

},{
	init : function(type, grp) {
		if (APP.Ctx.authType > 0) {
			this.type = APP.Ctx.authType;
			this.grp = APP.Ctx.authGrp;
		} else {
			this.type = type;
			this.grp = grp;
		}
		this.selId = "A" + this.type + this.grp;
		this._super(this.constructor.line(type, grp), this.constructor.column(), "TraceMail", false, this.selId);
		this.filterKeys = ['**C.'];
		this.traces = [];
	},
	
	updateNodes : function(nodes) {
	    if (nodes.Trace) {
	    	for (var i = 0, x = null; x = nodes.Trace[i]; i++){
	    		var j = this.traces.length;
	    		for (var k = 0, y = null; y = this.traces[k]; k++)
	    			if (y.code == x.code) {
	    				j = k;
	    				break;
	    			}
	    		if (j == this.traces.length)
	    			this.traces.push({code:x.code});
	    		var z = this.traces[j];
	    		z.lot = x.lot ? x.lot : "";
	    		z.status = x.status ? x.status : 0;
	    		z.to = x.to ? x.to : "";;
	    		z.taille = x.taille ? x.taille : 0;
	    		z.statusText = x.statusText ? x.statusText : "";
	    		z.initiales = x.initiales ? x.initiales : "";
	    	}
	    	this.traces.sort(AC.Sort.i);
	    }
	},
	
	edit : function(){
		var sb = new StringBuffer();
		sb.append("<div class='italic acSpace1'>Status : <br>");
		sb.append("OK : messages envoyés normalement<br>");
		sb.append("B : messages NON envoyés : ne reçoit pas de synthèse hebdomadaire<br>");
		sb.append("C : messages NON envoyés : adresse(s) e-mail non valide<br>");
		sb.append("D : messages NON envoyés : synthèse vide (pas de commandes récentes / en cours)<br>");
		sb.append("Erreur : messages NON envoyés : refus d'envoi par le mailer<br><br></div>");

		var t = new AC.Table(3, true, false, [0, 4, 0, 0]);
		t.clazz("inverse bold").row("Contact / rapport", "Lot", "OK B C D Erreur", "Taille");
		for(var i = 0, x = null; x = this.traces[i]; i++){
			if (x.statusText.length > 300)
				var z = x.statusText.substring(0, 300).escapeHTML();
			else {
				var z = x.statusText;
				if (z.indexOf(">Lien vers le texte d'erreur</a>") == -1)
					z = z.escapeHTML();
			}
			var r1 = x.initiales + " - " + x.code + " [" + z + "]";
			var r2 = this.constructor.libStatus[x.status];
			t.row(r1, x.lot, r2, x.taille);
		}
		sb.append(t.flush());
		return sb.toString();
	}
	
});

/** ******************************************************************* */
AC.Cell("AC.LivrP", {

	line : function(gap) {
		return "P." + gap + ".";
	},
	
	column : function() {
		return "0.";
	},
	
	filtreOf : function(filtre, codeLivr) {
		var cl = (!codeLivr ? "000" : (codeLivr > 99 ? "" + codeLivr : (codeLivr > 9 ? "0" + codeLivr : "00" + codeLivr)));
		var ap = APP.Ctx.authType == 2 && APP.Ctx.authUsr ? APP.Ctx.authUsr : "";
		return filtre + cl + ap;
	},
	
	get : function(gap, filtre, codeLivr) {
		return this._super(this.line(gap), this.column(), "LivrP", this.filtreOf(filtre, codeLivr));
	},
	
	getN : function(gap, filtre, codeLivr) {
		var x = this.get(gap, filtre, codeLivr);
		if (!x)
			x = new AC.LivrP(gap, this.filtreOf(filtre, codeLivr));
		return x;
	}

}, {
	// Filtre X : parametre ap = usr . M.ap (SGAp) I.ap (Ap)
	// Filtre Y : aucun parametre. L. (SG) J. (Gac)
	// Filtre Z : parametre codeLivr obligatoire, ap est usr si non 0. 
	//            J.cl (gac), H.cl.ap (ap), K.cl.ap (SGAp)
    init : function(gap, filtre) {
	    this._super(this.constructor.line(gap), this.constructor.column(), "LivrP", false, filtre);
	    this.gap = gap;
	    this.cellGap = AC.GAP.getN(gap);
	    this.ctlg = AC.Catalogue.getN(this.gap);
	    this.ap = APP.Ctx.authType == 2 && APP.Ctx.authUsr ? APP.Ctx.authUsr : 0;
	    this.filtre = filtre.substring(0,1);
	    if (this.filtre == "X") {
		    var k1 = "" + this.ap + ".";
		    this.filterKeys = ['*+M.' + k1, '*+I.' + k1];
	    } else if (this.filtre == "Y") {
		    this.filterKeys = ['*+L.', '*+J.'];
	    } else if (this.filtre == "Z") {
		    var k1 = this.ap ? "" + this.ap + "." : "";
		    this.codeLivr = parseInt(filtre.substring(1,4), 10);
		    var k2 = this.codeLivr + "."
		    this.filterKeys = ['*+L.', '*+H.' + k2 + k1, '*+J.' + k2, '*+K.' + k2 + k1];
	    } 
	    this.store = {};
    },

	getCellGap : function(x){
		return this.cellGap;
	},

    phase : function(x){
		return x.slivr ? x.slivr.phase : (x.livr ? x.livr.phase : AC.ac2.phaseMax);
    },
    
    attach : function(page) {
	    this._super(page);
    },

    storeAndPush : function(x) {
	    var k = x.type + "_" + x.id;
	    this.store[k] = x;
    },

	get : function(id){
		AC.assert(id, "id non enregistrée :" + id);
		var x = this.store[id];
		if (x)
			return x;
		var ids = id.split("_");
		var n = "norm" + ids[0];
		var f = this[n];
		AC.assert(f, "fonction inconnue : " + n);
		return f.call(this, null, ids);
	},

	normAp : function(x, ids){
		if (!x)
			x = {codeLivr:ids[1], gac:ids[2], ap:ids[3]};
		if (x.app == 1 || x.ap >= 100)
			x.descr = x.descr === undefined ? "" : x.descr;
		return this.normApx(x);
	},

	normSGAp : function(x, ids){
		if (!x)
			x = {codeLivr:ids[1], ap:ids[2]};
		if (x.ap == 1 || x.ap >= 100) {
			x.dbj = x.dbj === undefined ? 0 : x.dbj;
			x.crj = x.crj === undefined ? 0 : x.crj;		
		}
		return this.normApx(x);
	},

	normApx : function(x){
		x.cell = this;
		if (x.gac) {
			x.slivr = APP.Ctx.cal.getSlivr(this.gap, x.codeLivr, x.gac);
			x.type = "Ap";
			x.id = "" + x.codeLivr + "_" + x.gac + '_' + x.ap + "_";
		} else {
			x.livr = APP.Ctx.cal.getLivr(this.gap, x.codeLivr);
			x.type = "SGAp";
			x.id = "" + x.codeLivr + "_" + x.ap + "_";
		}
		x.regltFait = x.regltFait === undefined ? 0 : x.regltFait;
		x.panierAtt = x.panierAtt === undefined ? 0 : x.panierAtt;
		x.nblg = x.nblg === undefined ? 0 : x.nblg;
		x.poids = x.poids === undefined ? 0 : x.poids;
		x.prix = x.prix === undefined ? 0 : x.prix;
		x.poidsC = x.poidsC === undefined ? 0 : x.poidsC;
		x.prixC = x.prixC === undefined ? 0 : x.prixC;
		x.poidsD = x.poidsD === undefined ? 0 : x.poidsD;
		x.prixD = x.prixD === undefined ? 0 : x.prixD;
		x.flags = x.flags === undefined ? 0 : x.flags;
		x.prixPG = x.prixPG === undefined ? 0 : x.prixPG;
		x.db = x.db === undefined ? 0 : x.db;
		x.cr = x.cr === undefined ? 0 : x.cr;
		x.cheque = x.cheque === undefined ? 0 : x.cheque;
		x.remiseCheque = x.remiseCheque === undefined ? 0 : x.remiseCheque;
		x.suppl = x.suppl === undefined ? 0 : x.suppl;
		if (x.ap == 1 || x.ap >= 100) {
			x.status = x.nblg || x.prix || x.prixPG || x.poidsC || x.prixC || x.descr
				|| x.cheque || x.suppl || x.db || x.cr || x.dbj || x.crj ? 2 : 1;
		} else
			x.status = x.nblg || x.prix ? 2 : 1;
		return x;
	},

	normSG : function(x, ids){
		return this.normGac(x, ids);
	},

	normGac : function(x, ids){
		if (!x) {
			x = {codeLivr:ids[1]};
			if (ids.length == 3)
				x.gac = ids[2];
		}
		x.cell = this;
		if (x.gac) {
			x.slivr = APP.Ctx.cal.getSlivr(this.gap, x.codeLivr, x.gac); // Gac
			x.type = "Gac";
			x.id = "" + x.codeLivr + "_" + x.gac + '_';
		} else {
			x.livr = APP.Ctx.cal.getLivr(this.gap, x.codeLivr);
			x.type = "SG";
			x.id = "" + x.codeLivr + "_";
		}
		x.regltFait = x.regltFait === undefined ? 0 : x.regltFait;
		x.panierAtt = x.panierAtt === undefined ? 0 : x.panierAtt;
		x.nblg = x.nblg === undefined ? 0 : x.nblg;
		x.poids = x.poids === undefined ? 0 : x.poids;
		x.prix = x.prix === undefined ? 0 : x.prix;
		x.poidsC = x.poidsC === undefined ? 0 : x.poidsC;
		x.prixC = x.prixC === undefined ? 0 : x.prixC;
		x.poidsD = x.poidsD === undefined ? 0 : x.poidsD;
		x.prixD = x.prixD === undefined ? 0 : x.prixD;
		x.flags = x.flags === undefined ? 0 : x.flags;
		x.db = x.db === undefined ? 0 : x.db;
		x.cr = x.cr === undefined ? 0 : x.cr;
		x.dbj = x.dbj === undefined ? 0 : x.dbj;
		x.crj = x.crj === undefined ? 0 : x.crj;
		x.cheque = x.cheque === undefined ? 0 : x.cheque;
		x.remiseCheque = x.remiseCheque === undefined ? 0 : x.remiseCheque;
		x.suppl = x.suppl === undefined ? 0 : x.suppl;
		x.status = x.nblg || x.prix || x.prixPG || x.poidsC || x.prixC
			|| x.cheque || x.suppl || x.db || x.cr || x.dbj || x.crj ? 2 : 1;
		return x;
	},

    updateNodes : function(nodes) {
	    this.toSet = {};
	    if (!nodes)
		    return;
	    if (nodes.SG)
	    	for ( var ii = 0, x = null; x = nodes.SG[ii]; ii++)
	    		if (x.codeLivr) // BUG workaround
	    			this.storeAndPush(this.normGac(x));
	    if (nodes.SGAp) {
		    for ( var ii = 0, x = null; x = nodes.SGAp[ii]; ii++)
			    this.storeAndPush(this.normSGAp(x));
	    }
	    if (nodes.Ap) {
		    for ( var ii = 0, x = null; x = nodes.Ap[ii]; ii++)
			    this.storeAndPush(this.normAp(x));
	    }
	    if (nodes.Gac)
		    for ( var ii = 0, x = null; x = nodes.Gac[ii]; ii++)
			    this.storeAndPush(this.normGac(x));
    },
    
	getSG : function(f, codeLivr){
		var x = this.store["SG_"+ codeLivr + "_"];
		if (x && x.status == 2)
			return x;
		if (!f)
			return null;
		return x ? x  : this.normGac({codeLivr:codeLivr});
	},

	getSGAp : function(f, codeLivr, ap){
		var x = this.store["SGAp_" + codeLivr + "_" + ap + "_"];
		if (x && x.status == 2)
			return x;
		if (!f)
			return null;
		return x ? x  : this.normSGAp({ap:ap, codeLivr:codeLivr});
	},

	getAp : function(f, codeLivr, gac, ap){
		var x = this.store["Ap_" + codeLivr + "_" + gac + "_" + ap + "_"];
		if (x && x.status == 2)
			return x;
		if (!f)
			return null;
		return x ? x  : this.normAp({ap:ap, gac:gac, codeLivr:codeLivr});
	},

	getGac : function(f, codeLivr, gac){
		var x = this.store["Gac_" + codeLivr + "_" + gac + "_"];
		if (x && x.status == 2)
			return x;
		if (!f)
			return null;
		return x ? x  : this.normGac({gac:gac, codeLivr:codeLivr});
	},
	
	getAllApPrT : function(codeLivr, ap){
		var res = {};
		var k = "ApPrT_" + codeLivr + "_" + ap + "_";
		for(var x in this.store){
			if (x.startsWith(k)) {
				var y = this.store[x];
				res[y.pr] = y;
			}
		}
		return res;
	},
	
//	getApPrT : function(f, codeLivr, ap, pr){
//		var k = "ApPrT_" + codeLivr + "_" + ap + "_" + pr + "_";
//		var x = this.store[k];
//		if (x && x.status == 2)
//			return x;
//		if (!f)
//			return null;
//		return x ? x : this.newApPrT(codeLivr, ap, pr);
//	},
	
	
	
	buildApPrT : function(codeLivr, ap, cx){
		var id2 = "ApPr_" + ap + "_";
		var prx = {}
		for(var gac in cx){
			var lc = cx[gac];
			for(var i in lc.store){
				if (i.startsWith(id2)) {
					var x = lc.store[i];
					var e = prx[x.pr];
					if (!e){
						prx[x.pr] = [];
						e = prx[x.pr];
					}
					e.push(x);
				}
			}
		}
		for(var pr in prx){
			var xs = prx[pr];
			var y = this.sigmaApPr(codeLivr, ap, pr, xs);
			this.store["ApPrT_" + y.id] = y;
		}
	},
	
	prodDescr : function(x){
		if (!x.prod)
			return null;
		var pd = this.ctlg.get(x.prod);
		if (!pd)
			return null;
		return {pd: pd, cv:pd.prix[x.codeLivr]};
	},

	newApPrT : function(codeLivr, apx, prx){
		var ap = parseInt(apx, 10);
		var pr = parseInt(prx, 10);
		return {type:"ApPrT", cell:this, codeLivr:codeLivr, ap:ap, pr:pr, prod:(ap * 10000) + pr,
				id:codeLivr + "_" + ap + "_" + pr + "_",
				reglFait:0, panierAtt:0, 
				qte:0, qteS:0, nblg:0, poids:0, prix:0, 
				qteC:0, poidsC:0, prixC:0,
				qteD:0, poidsD:0, prixD:0, flags:0, status:1 };
	},
	
	sigmaApPr : function(codeLivr, ap, pr, xs){
		var x = this.newApPrT(codeLivr, ap, pr);
		if (xs && xs.length !=0){
			for(var i = 0, y = null; y = xs[i]; i++) {
				if (y.status != 2)
					continue;
				x.reglFait += y.regltFait;
				x.panierAtt += y.panierAtt;
				x.qte += y.qte;
				x.qteS += y.qteS;
				x.nblg += y.nblg;
				x.poids += y.poids;
				x.prix += y.prix;
				x.qteC += y.qteC;
				x.poidsC += y.poidsC;
				x.prixC += y.prixC;
				x.qteD += y.qteD;
				x.poidsD += y.poidsD;
				x.prixD += y.prixD;
				x.flags = x.flags | y.flags;
				x.status = 2;
			}
		}
		return x;
	}

});

/** ******************************************************************* */
AC.Cell("AC.LivrG", {

	line : function(gac) {
		return "C." + gac + ".";
	},
	
	column : function() {
		return "0.";
	},
	
	get : function(gac) {
		return this._super(this.line(gac), this.column(), "LivrG");
	},
	
	getN : function(gac) {
		var x = this.get(gac);
		if (!x)
			x = new AC.LivrG(gac);
		return x;
	},
	
	fields : ["nblg", "poids", "prix", "db", "cr", "cheque", "payePar", "payePour", "suppl", "panierAtt", "regltFait"],
	
	fields2 : ["nblg", "poids", "prix", "db", "cr", "cheque", "payePar", "payePour", "suppl", "panierAtt", "regltFait",
	           "poidsC", "prixC", "poidsD", "prixD", "dbj", "crj"]
	
}, {
    
    init : function(gac) {
	    this._super(this.constructor.line(gac), this.constructor.column(), "LivrG");
	    this.gac = gac;
	    this.cellGac = AC.GAC.getN(gac);
	    this.ac = APP.Ctx.authType == 1 ? APP.Ctx.authUsr : 0;
	    var k = this.ac ? "" + this.ac + "." : "";
	    this.filterKeys = ['*+A.', '*+B.' + k];
	    this.store = {};
    },

	getCellGap : function(x){
		return x && x.gap ? AC.GAP.getN(x.gap) : null;
	},

    phase : function(x){
    	if (x.phase != undefined)
    		return x.phase;
		return x.slivr ? x.slivr.phase : (x.livr ? x.livr.phase : AC.ac2.phaseMax);
    },

    attach : function(page) {
	    this._super(page);
    },

    storeAndPush : function(x) {
	    var k = x.type + "_" + x.id;
	    this.store[k] = x;
    },

	get : function(id){
		AC.assert(id, "id non enregistrée :" + id);
		var x = this.store[id];
		if (x)
			return x;
		var ids = id.split("_");
		var n = "norm" + ids[0];
		var f = this[n];
		AC.assert(f, "fonction inconnue : " + n);
		return f.call(this, null, ids);
	},

	normAc : function(x, ids){
		if (!x)
			x = {codeLivr:ids[1], gap:ids[2], ac:ids[3]};
		x.slivr = APP.Ctx.cal.getSlivr(x.gap, x.codeLivr, this.gac);
		x.cell = this;
		x.type = "Ac";
		x.id = "" + x.codeLivr + "_" + x.gap + '_' + x.ac + "_";
		x.regltFait = x.regltFait === undefined ? 0 : x.regltFait;
		x.panierAtt = x.panierAtt === undefined ? 0 : x.panierAtt;
		x.nblg = x.nblg === undefined ? 0 : x.nblg;
		x.poids = x.poids === undefined ? 0 : x.poids;
		x.prix = x.prix === undefined ? 0 : x.prix;
		x.flags = x.flags === undefined ? 0 : x.flags;
		x.db = x.db === undefined ? 0 : x.db;
		x.cr = x.cr === undefined ? 0 : x.cr;
		x.cheque = x.cheque === undefined ? 0 : x.cheque;
		x.payePar = x.payePar === undefined ? 0 : x.payePar;
		x.payePour = x.payePour === undefined ? 0 : x.payePour;
		x.suppl = x.suppl === undefined ? 0 : x.suppl;
		x.status = x.nblg || x.prix || x.cheque || x.payePar || x.payePour || x.suppl || x.db || x.cr ? 2 : 1;
		return x;
	},

	normGac : function(x, ids){
		if (!x)
			x = {codeLivr:ids[1], gap:ids[2]};
		x.slivr = APP.Ctx.cal.getSlivr(x.gap, x.codeLivr, this.gac);
		x.cell = this;
		x.type = "Gac";
		x.id = "" + x.codeLivr + "_" + x.gap + '_';
		x.regltFait = x.regltFait === undefined ? 0 : x.regltFait;
		x.panierAtt = x.panierAtt === undefined ? 0 : x.panierAtt;
		x.nblg = x.nblg === undefined ? 0 : x.nblg;
		x.poids = x.poids === undefined ? 0 : x.poids;
		x.prix = x.prix === undefined ? 0 : x.prix;
		x.poidsC = x.poidsC === undefined ? 0 : x.poidsC;
		x.prixC = x.prixC === undefined ? 0 : x.prixC;
		x.poidsD = x.poidsD === undefined ? 0 : x.poidsD;
		x.prixD = x.prixD === undefined ? 0 : x.prixD;
		x.flags = x.flags === undefined ? 0 : x.flags;
		x.db = x.db === undefined ? 0 : x.db;
		x.cr = x.cr === undefined ? 0 : x.cr;
		x.dbj = x.dbj === undefined ? 0 : x.dbj;
		x.crj = x.crj === undefined ? 0 : x.crj;
		x.cheque = x.cheque === undefined ? 0 : x.cheque;
		x.suppl = x.suppl === undefined ? 0 : x.suppl;
		x.status = x.nblg || x.prix || x.prixPG || x.poidsC || x.prixC
			|| x.cheque || x.suppl || x.db || x.cr || x.dbj || x.crj ? 2 : 1;
		return x;
	},

    updateNodes : function(nodes) {
	    this.toSet = {};
	    if (!nodes)
		    return;
	    if (nodes.Ac) {
		    for ( var ii = 0, x = null; x = nodes.Ac[ii]; ii++)
			    this.storeAndPush(this.normAc(x));
	    }
	    if (nodes.Gac)
		    for ( var ii = 0, x = null; x = nodes.Gac[ii]; ii++)
			    this.storeAndPush(this.normGac(x));
    },
    
	getGac : function(f, codeLivr, gap){
		var x = this.store["Gac_"+ codeLivr + "_" + gap + '_'];
		if (x && x.status == 2)
			return x;
		if (!f)
			return null;
		return x ? x  : this.normGac({gap:gap, codeLivr:codeLivr});
	},

	getAc : function(f, codeLivr, gap, ac){
		var x = this.store["Ac_"+ codeLivr + "_" + gap + '_' + ac + "_"];
		if (x && x.status == 2)
			return x;
		if (!f)
			return null;
		return x ? x  : this.normGac({gap:gap, codeLivr:codeLivr});
	},

	getClAc : function(lstLv, ac){
		var x = this.normAc({});
		x.ac = ac;
		x.gac = this.gac;
		x.status = 1;
		x.id = "" + x.ac + "_";
		x.type = "SGAc";
		var fs = this.constructor.fields;
		var ph = 0;
		for (var j = 0, obj = null; obj = lstLv[j]; j++){
			if (obj.phase > ph)
				ph = obj.phase;
			var k = "Ac_" + obj.codeLivr + "_" + obj.gap + "_" + ac + "_";
			var c = this.store[k];
			if (!c || c.status == 1)
				continue;
			for(var i=0, f=null; f=fs[i]; i++){
				var z = c[f];
				if (!z)
					continue;
				x[f] += z;
				x.status = 2;
			}
			if (c.flags) {
				x.flags = x.flags | c.flags;
				x.status = 2;
			}
		}
		x.phase = ph;
		this.store[x.type + "_" + x.id] = x;
		return x;
	},

	getCl : function(lstLv){
		var x = this.normGac({});
		x.status = 1;
		x.id = "";
		x.type = "SGGac";
		var ph = 0;
		var fs = this.constructor.fields2;
		for (var j=0, obj=null; obj = lstLv[j]; j++){
			if (obj.phase > ph)
				ph = obj.phase;
			var k = "Gac_" + obj.codeLivr + "_" + obj.gap + "_";
			var c = this.store[k];
			if (!c)
				continue;
			for(var i=0, f=null; f=fs[i]; i++){
				var z = c[f];
				if (!z)
					continue;
				x[f] += z;
				x.status = 2;
			}
			if (c.flags) {
				x.flags = x.flags | c.flags;
				x.status = 2;
			}
		}
		x.phase = ph;
		this.store[x.type + "_" + x.id] = x;
		return x;
	}

});

/** **************************************************************** */
AC.Cell("AC.LivrC", {

	line : function(gap) {
		return "P." + gap + ".";
	},
	
	column : function(livr, gac) {
		return livr + "." + gac + ".";
	},
	
	filtreOf : function(filtre, ap) {
		return !filtre ? "A" : (filtre == "U" ? "U" : filtre + (ap ? ap : ""));
	},
	
	get : function(gap, livr, gac, filtre, ap) {
		return this._super(this.line(gap), this.column(livr, gac), "LivrC", this.filtreOf(filtre, ap));
	},
	
	getN : function(gap, livr, gac, filtre, ap) {
		var x = this.get(gap, livr, gac, filtre, ap);
		if (!x)
			x = new AC.LivrC(gap, livr, gac, this.filtreOf(filtre, ap));
		return x;
	},
	
	sumApPr : function(x, y, noComptaAC, taux){
		x.qteS += y.qteS;
		x.nblg += y.nblg;
		x.qte += y.qte;
		x.poids += y.poids;
		x.prix += y.prix;

		x.qteC += y.qteCX;
		x.poidsC += y.poidsCX;
		x.prixC += y.prixCX;
		
		x.qteD += y.qteDX;
		x.poidsD += y.poidsDX;
		x.prixD += y.prixDX;

		x.prixB += y.prixD;
		var z = taux ? Math.floor(y.prixD * taux / 100) : 0;
		x.prelev += z;
		x.prixN += y.prixD - z;

		if (noComptaAC){
			x.qte = x.qteC;
			x.poids = x.poidsC;
			x.prix = x.prixC;
		}

		x.flags = x.flags | y.flags;
		x.gacs[y.cell.gac] = y;
		return x;
	},
	
	copyApPr : function(x, y, noComptaAC, taux){
		x.cell = y.cell;
		x.type = y.type;
		x.id = "";
		x.gap = y.gap;
		x.ap = y.ap;
		x.pr = y.pr;
		x.prod = y.prod;
		x.typePrix = y.typePrix;
		x.qteS = y.qteS;
		x.nblg = y.nblg;
		x.qte = y.qte;
		x.poids = y.poids;
		x.prix = y.prix;			
		
		x.qteC = y.qteCX;
		x.poidsC = y.poidsCX;
		x.prixC = y.prixCX;
		
		x.qteD = y.qteDX;
		x.poidsD = y.poidsDX;
		x.prixD = y.prixDX;

		x.prixB = x.prixD;
		x.prelev = taux ? Math.floor(x.prixB * taux / 100) : 0;
		x.prixN = x.prixB - x.prelev;

		if (noComptaAC){
			x.qte = x.qteC;
			x.poids = x.poidsC;
			x.prix = x.prixC;
		}
		
		x.flags = y.flags;
		x.gacs = {};
		x.gacs[y.cell.gac] = y;
		return x;
	},
	
	aPoidsEstime : function(x) { // x est un AcApPr
		if (x == null)
			return true;
		var y = x.cell.prodDescr(x);
		return x.qte * y.cv.poids == x.poids * (y.pd.parDemi ? 2 : 1);
	}


}, {
	// Filtre "A" : TOUT
	// Filtre Xap : parametre ap facultatif (0), usr si non 0. C.ap (appr) et H.ap (ap)
	// Filtre Yap : parametre ap requis, usr si non 0. C.ap (appr) E.ap (acap) et B.ap (acApPr)
	// Filtre U   : C. tous les appr
	init : function(gap, codeLivr, gac, filtre) {
		this.filtre = filtre.substring(0,1);
		this.ap = filtre.length > 1 ? parseInt(filtre.substring(1), 10) : 0;
		this._super(this.constructor.line(gap), this.constructor.column(codeLivr, gac), "LivrC",
			false, this.filtre + (this.ap ? this.ap : ""));
		this.gap = gap;
		this.codeLivr = codeLivr;
		this.gac = gac;
		this.slivr = APP.Ctx.cal.getSlivr(this.gap, this.codeLivr, this.gac);
		this.cellGac = AC.GAC.getN(gac);
		this.cellGap = AC.GAP.getN(gap);
		this.ctlg = AC.Catalogue.get(gap);
		if (APP.Ctx.currentMode == 3) {
			// Filtre A toujours
			var fac = APP.Ctx.authAc + ".";
			this.filterKeys = ['=+T', '*+A.' + fac, '*+C.', '*+D.' + fac, '*+G.' + fac];
		} else {
			if (this.filtre == "A")
				this.filterKeys = ['=+T', '*+A.', '*+C.', '*+D.', '*+H.', '*+G.', '=+I'];
			else if (this.filtre == "X")
				this.filterKeys = this.ap ? ['=+T', '*+C.' + this.ap, '*+H.' + this.ap, '*+E.', '*+I'] 
					: ['=+T', '*+C.', '*+H.', '*+E.', '*+I'];
			else if (this.filtre == "Y")
				this.filterKeys = ['=+T', '*+C.' + this.ap, '*+E.' + this.ap, '*+B.' + this.ap];
			else if (this.filtre == "U")
				this.filterKeys = ['=+T', '*+C.'];
		}
		this.store = {};
	},

	upgrade : function(){
		delete AC.Cell.cells[this.key];
		this.filtre = "A";
		this.filterKeys = ['T', '*+A.', '*+C.', '*+D.', '*+H.', '*+G.', '=+I'];
		this.ap = 0;
		this.selId = "A";
		this.version = -1;
		this.key = this.nent + ":" + this.line + ":" + this.col + ":" + this.selId;
		this.name = "Cell_" + this.key;
		AC.Cell.cells[this.key] = this;
	},
	
	getCellGap : function(x){
		return this.cellGap;
	},
	
	getCtlgLivr : function(codeLivr, apx, gac){
		var lstAps = this.cellGap.existAt(this.slivr.livr.expedition);
		return this.ctlg.getCtlgLivr(codeLivr, apx, gac, lstAps);
	},
	
	getBdls : function(apx, ctlg){ // ap fac. ctlg fac, obtenu si absent et si pas apx
		var lv = {bdl:[], flags:{}, cpts:{}};
		if (!ctlg)
			ctlg = this.getCtlgLivr(codeLivr, apx, this.gac);
		for(var apz in ctlg){
			var ap = parseInt(apz, 10);
			if (apx && ap != apx)
				continue;
			var eltAp = this.cellGap.get(ap);
			for (var j = 0, zz = null; zz = ctlg[apz][j]; j++){
				var pd = zz.pd;
				var x = this.getApPr(true, ap, pd.pr);
				var y = {x:x, eltAp:eltAp, pd:pd, cv:zz.cv, cpts:{}};
				if (x.status == 2){
					if (!x.chargeL && x.qte) y.cpts.cmdNch = 1;
					if (x.chargeL && !x.qte) y.cpts.chNcmd = 1;
					if (!x.dechargeL && x.qte) y.cpts.cmdNdch = 1;
					if (x.dechargeL && !x.qte) y.cpts.dchNcmd = 1;
					if (x.chargeL && x.qte) y.cpts.cmdETch = 1;
					if (x.dechargeL && x.qte) y.cpts.cmdETdch = 1;
					
					for(var cc in y.cpts){
						if (lv.cpts[cc] == undefined)
							lv.cpts[cc] = 1;
						else
							lv.cpts[cc]++;
					}
					var lst = AC.Flag.listOf(x.flags);
					for(var k = 0, fl = 0; fl = lst[k]; k++){
						if (lv.flags[fl] == undefined)
							lv.flags[fl] = 1;
						else
							lv.flags[fl]++;						
					}
				}
				lv.bdl.push(y);
			}
		}
		return lv;
	},
	
	prodDescr : function(x){
		if (!x.prod)
			return null;
		var pd = this.ctlg.get(x.prod);
		if (!pd)
			return null;
		return {pd: pd, cv:pd.prix[this.slivr.codeLivr]};
	},
		
    phase : function(){
		return this.slivr.phase;
    },

	attach : function(page) {
		this._super(page);
	},

	storeAndPush : function(x) {
		var k = x.type + "_" + x.id;
		this.store[k] = x;
	},
	
	get : function(id){
		AC.assert(id, "id non enregistrée :" + id);
		var x = this.store[id];
		if (x)
			return x;
		var ids = id.split("_");
		var n = "norm" + ids[0];
		var f = this[n];
		AC.assert(f, "fonction inconnue : " + n);
		return f.call(this, null, ids);
	},
	
	getAcApPr : function(f, ac, ap, pr){
		var x = this.store["AcApPr_" + ac + "_" + ap + "_" + pr + "_"];
		if (x && x.status == 2)
			return x;
		if (!f)
			return null;
		return x ? x  : this.normAcApPr({ac:ac, ap:ap, pr:pr});
	},
	
	getAllApPr2 : function(ap){
		var prx = this.ctlg.lstProduits2(ap);
		var lst = {};
		for(var id in this.store){
			if (!id.startsWith("ApPr_" + ap + "_"))
				continue;
			var x = this.store[id];
			if (x && x.status == 2) 
				lst[x.pr] = {x:x, pd:prx[x.pr]};
		}
		return lst;
	},
	
	getAllApPr : function(ap){
		var prx = this.ctlg.lstProduits2(ap);
		var lst = [];
		for(var id in this.store){
			if (!id.startsWith("ApPr_" + ap + "_"))
				continue;
			var x = this.store[id];
			if (x && x.status == 2) 
				lst.push({x:x, pd:prx[x.pr]});
		}
		lst.sort(function(a, b){
			var au = a.pd.nom.toUpperCase();
			var bu = b.pd.nom.toUpperCase();
			if (au < bu)
				return -1;
			if (au > bu)
				return 1;
			return 0;
		});
		return lst;
	},

	getAcAllApPr : function(ac){
		var lst = [];
		for(var id in this.store){
			if (!id.startsWith("AcApPr_" + ac + "_"))
				continue;
			var x = this.store[id];
			if (x && x.status == 2) {
				var pd = this.ctlg.get(x.prod);
				lst.push({x:x, pd:pd, cv:pd.prix[this.codeLivr]});
			}
		}
		lst.sort(function(a, b){
			var au = a.pd.nom.toUpperCase();
			var bu = b.pd.nom.toUpperCase();
			if (au < bu)
				return -1;
			if (au > bu)
				return 1;
			return 0;
		});
		return lst;
	},

	getAcAllAp : function(ac){
		var lst = [];
		for(var id in this.store){
			if (!id.startsWith("AcAp_" + ac + "_"))
				continue;
			var x = this.store[id];
			if (x && x.status == 2) {
				var eltAp = this.cellGap.get(x.ap);
				lst.push({x:x, eltAp:eltAp, code:eltAp.code, initiales:eltAp.initiales});
			}
		}
		lst.sort(AC.Sort.gap);
		return lst;
	},

	getAcApAllPr : function(ac, ap){
		var prx = this.ctlg.lstProduits2(ap);
		var lst = [];
		for(var id in this.store){
			if (!id.startsWith("AcApPr_" + ac + "_" + ap + "_"))
				continue;
			var x = this.store[id];
			if (x && x.status == 2) 
				lst.push({x:x, pd:prx[x.pr]});
		}
		lst.sort(function(a, b){
			var au = a.pd.nom.toUpperCase();
			var bu = b.pd.nom.toUpperCase();
			if (au < bu)
				return -1;
			if (au > bu)
				return 1;
			return 0;
		});
		return lst;
	},

	getAcAp : function(f, ac, ap){
		var x = this.store["AcAp_" + ac + "_" + ap + "_" ];
		if (x && x.status == 2)
			return x;
		if (!f)
			return null;
		return x ? x  : this.normAcAp({ac:ac, ap:ap});
	},

	getEltsAcAp : function(ap, cellGac){
		var res = [];
		var lst = cellGac.getContacts();
		for(var i = 0, e = null; e = lst[i]; i++){
			var x = this.getAcAp(false, e.code, ap);
			if (x && x.status == 2) {
				e.acAp = x;
				res.push(e);
			}
		}
		return res;
	},
	
	getEltsAcApPr : function(ap, pr, cellGac){
		var res = [];
		var lst = cellGac.getContacts();
		for(var i = 0, e = null; e = lst[i]; i++){
			var x = this.getAcApPr(true, e.code, ap, pr);
			if (x && (x.status == 2 || e.code == 1)) {
				e.acApPr = x;
				res.push(e);
			}
		}
		return res;
	},

	getAc : function(f, ac){
		var x = this.store["Ac_" + ac + "_" ];
		if (x && x.status == 2)
			return x;
		if (!f)
			return null;
		return x ? x  : this.normAc({ac:ac});
	},

	getApPr : function(f, ap, pr){
		var x = this.store["ApPr_" + ap + "_" + pr + "_"];
		if (x && x.status == 2)
				return x;
		if (!f)
			return null;
		return x ? x  : this.normApPr({ap:ap, pr:pr});
	},

	getApAllPr : function(ap, xAp){
		xAp.prixCX = 0;
		xAp.poidsCX = 0;
		xAp.prixDX = 0;
		xAp.poidsDX = 0;
		for(var id in this.store){
			if (!id.startsWith("ApPr_"))
				continue;
			if (ap && !id.startsWith("ApPr_" + ap + "_"))
				continue;
			var x = this.store[id];
			if (x && x.status == 2) {
				xAp.prixCX += x.prixCX;
				xAp.poidsCX += x.poidsCX;
				xAp.prixDX += x.prixDX;
				xAp.poidsDX += x.poidsDX;				
			} 
		}
		return xAp;
	},

	getAp : function(f, ap){
		var x = this.store["Ap_" + ap + "_"];
		if (x && x.status == 2)
			return this.getApAllPr(ap, x);
		if (!f)
			return null;
		return x ? this.getApAllPr(ap, x)  : this.normAp({ap:ap});
	},

	getGac : function(f){
		var x = this.store["Gac_"];
		if (x && x.status == 2)
			return this.getApAllPr(null, x);
		if (!f)
			return null;
		return x ? this.getApAllPr(null, x)  : this.normGac({});
	},

	normAcApPr : function(x, ids){
		if (!x)
			x = {ac:ids[1], ap:ids[2], pr:ids[3]};
		x.cell = this;
		x.type = "AcApPr";
		x.id = "" + x.ac + "_" + x.ap + "_" + x.pr + "_";
		x.prod = (x.ap * 10000) + x.pr;
		x.typePrix = x.prod % 10;
		x.rayon = Math.floor(x.pr / 10) % 10;
		x.qte = x.qte === undefined ? 0 : x.qte;
		x.qteS = x.qteS === undefined ? 0 : x.qteS;
		x.poids = x.poids === undefined ? 0 : x.poids;
//		x.poids_ = x.poids < 0; // remplace par AC.LivrC.aPoisEstime(x)
		x.poids = x.poids < 0 ? -x.poids : x.poids;
		x.prix = x.prix === undefined ? 0 : x.prix;
		x.flags = x.flags === undefined ? 0 : x.flags;
		if (x.typePrix == 2)
			x.lprix = x.lprix === undefined ? [] : x.lprix;
		x.status = x.qte || x.qteS || (x.lprix && x.lprix.length != 0) ? 2 : 1;
		return x;
	},

	normAcAp : function(x, ids){
		if (!x)
			x = {ac:ids[1], ap:ids[2]};
		x.cell = this;
		x.type = "AcAp";
		x.id = "" + x.ac + "_" + x.ap + "_";
		x.nblg = x.nblg === undefined ? 0 : x.nblg;
		x.poids = x.poids === undefined ? 0 : x.poids;
		x.prix = x.prix === undefined ? 0 : x.prix;
		x.flags = x.flags === undefined ? 0 : x.flags;
		x.prixPG = x.prixPG === undefined ? 0 : x.prixPG;
		x.db = x.db === undefined ? 0 : x.db;
		x.cr = x.cr === undefined ? 0 : x.cr;
		x.cheque = x.cheque === undefined ? 0 : x.cheque;
		x.payePar = x.payePar === undefined ? 0 : x.payePar;
		x.ami = x.ami === undefined ? 0 : x.ami;
		x.lstPar = [];
		if (x.amisPar) {
			for ( var i = 0, a = 0; a = x.amisPar[i]; i++)
				x.lstPar.push({ac : a % 1000, m : Math.floor(a / 1000)});
		} else {
			// inutile : le serveur remplit amisPar
			if (x.ami)
				x.lstPar.push({ac : x.ami, m : x.payePar});
		}
		x.payePour = x.payePour === undefined ? 0 : x.payePour;
		x.regltFait = x.regltFait === undefined ? 0 : x.regltFait;
		x.panierAtt = x.panierAtt === undefined ? 0 : x.panierAtt;
		x.lstPour = [];
		if (x.amisPour)
			for ( var i = 0, a = 0; a = x.amisPour[i]; i++)
				x.lstPour.push({ac : a % 1000, m : Math.floor(a / 1000)});
		x.suppl = x.suppl === undefined ? 0 : x.suppl;
		x.supDescr = x.descr === undefined ? "" : x.descr;
		x.intitule = x.intitule === undefined ? "" : x.intitule;
		if (x.ap == 1 || x.ap >= 100) {
			x.status = x.nblg || x.prix || x.prixPG 
				|| x.supDescr || x.cheque || x.payePar || x.payePour || x.suppl ? 2 : 1;
		} else
			x.status = x.nblg || x.prix ? 2 : 1;
		return x;
	},

	normAc : function(x, ids){
		if (!x)
			x = {ac:ids[1]};
		x.cell = this;
		x.type = "Ac";
		x.id = "" + x.ac + "_";
		x.nblg = x.nblg === undefined ? 0 : x.nblg;
		x.poids = x.poids === undefined ? 0 : x.poids;
		x.prix = x.prix === undefined ? 0 : x.prix;
		x.flags = x.flags === undefined ? 0 : x.flags;
		x.regltFait = x.regltFait === undefined ? 0 : x.regltFait;
		x.panierAtt = x.panierAtt === undefined ? 0 : x.panierAtt;
		x.db = x.db === undefined ? 0 : x.db;
		x.cr = x.cr === undefined ? 0 : x.cr;
		x.cheque = x.cheque === undefined ? 0 : x.cheque;
		x.payePar = x.payePar === undefined ? 0 : x.payePar;
		x.payePour = x.payePour === undefined ? 0 : x.payePour;
		x.suppl = x.suppl === undefined ? 0 : x.suppl;
		x.status = x.nblg || x.prix || x.poids || x.cheque || x.payePar || x.payePour || x.suppl ? 2 : 1;
		return x;
	},

	normApPr : function(x, ids){
		if (!x)
			x = {ac:ids[1], pr:ids[2]};
		x.cell = this;
		x.type = "ApPr";
		x.id = "" + x.ap + "_" + x.pr + "_";
		x.prod = (x.ap * 10000) + x.pr;
		x.typePrix = x.prod % 10;
		x.rayon = Math.floor(x.pr / 10) % 10;
		x.qte = x.qte === undefined ? 0 : x.qte;
		x.qteS = x.qteS === undefined ? 0 : x.qteS;
		x.nblg = x.nblg === undefined ? 0 : x.nblg;
		x.poids = x.poids === undefined ? 0 : x.poids;
		x.prix = x.prix === undefined ? 0 : x.prix;
		x.charge = x.charge === undefined ? 0 : x.charge;
		x.decharge = x.decharge === undefined ? 0 : x.decharge;
		x.qteC = x.qteC === undefined ? 0 : x.qteC;
		x.poidsC = x.poidsC === undefined ? 0 : x.poidsC;
		x.prixC = x.prixC === undefined ? 0 : x.prixC;
		x.qteD = x.qteD === undefined ? 0 : x.qteD;
		x.poidsD = x.poidsD === undefined ? 0 : x.poidsD;
		x.prixD = x.prixD === undefined ? 0 : x.prixD;
		x.flags = x.flags === undefined ? 0 : x.flags;
		if (x.typePrix == 2) {
			x.lprix = x.lprix === undefined ? [] : x.lprix;
			x.lprixC = x.lprixC === undefined ? [] : x.lprixC;
			x.lprixT = 0;
			x.lprixTC = 0;
			for(var i = 0, p = 0; p = x.lprix[i]; i++)
				x.lprixT += Math.round(p / 1000);
			for(var i = 0, p = 0; p = x.lprixC[i]; i++)
				x.lprixTC += Math.round(p / 1000);
		}
		
		x.chargeL = x.qteC || (x.lprixC && x.lprixC.length != 0);
		x.dechargeL = x.qteD || (x.lprix && x.lprix.length != 0);
		
		x.qteCX = x.charge ? x.qteC : x.qte;
		x.poidsCX = x.charge ? x.poidsC : x.poids;
		x.prixCX = x.charge ? x.prixC : x.prix;
		
		x.qteDX = x.decharge ? x.qteD : x.qteCX;
		x.poidsDX = x.decharge ? x.poidsD : x.poidsCX;
		x.prixDX = x.decharge ? x.prixD : x.prixCX;

		x.status = x.qte || x.qteS || x.qteC || x.poidsC || x.prixC 
			|| x.qteD || x.poidsD || x.prixD || x.charge || x.decharge
			|| (x.lprix && x.lprix.length !=0) || (x.lprixC && x.lprixC.length !=0) ? 2 : 1;
		return x;
	},

	normAp : function(x, ids){
		if (!x)
			x = {ap:ids[1]};
		x.cell = this;
		x.type = "Ap";
		x.id = "" + x.ap + "_";
		x.nblg = x.nblg === undefined ? 0 : x.nblg;
		x.poids = x.poids === undefined ? 0 : x.poids;
		x.prix = x.prix === undefined ? 0 : x.prix;
		x.poidsC = x.poidsC === undefined ? 0 : x.poidsC;
		x.prixC = x.prixC === undefined ? 0 : x.prixC;
		x.poidsD = x.poidsD === undefined ? 0 : x.poidsD;
		x.prixD = x.prixD === undefined ? 0 : x.prixD;
		x.flags = x.flags === undefined ? 0 : x.flags;
		x.prixPG = x.prixPG === undefined ? 0 : x.prixPG;
		x.regltFait = x.regltFait === undefined ? 0 : x.regltFait;
		x.panierAtt = x.panierAtt === undefined ? 0 : x.panierAtt;
		x.db = x.db === undefined ? 0 : x.db;
		x.cr = x.cr === undefined ? 0 : x.cr;
		x.cheque = x.cheque === undefined ? 0 : x.cheque;
		x.remiseCheque = x.remiseCheque === undefined ? 0 : x.remiseCheque;
		x.suppl = x.suppl === undefined ? 0 : x.suppl;
		x.descr = x.descr === undefined ? "" : x.descr;
		if (x.ap == 1 || x.ap >= 100) {
			x.status = x.nblg || x.prix || x.prixPG || x.poidsC || x.prixC || x.descr
				|| x.cheque || x.suppl || x.db || x.cr ? 2 : 1;
		} else
			x.status = x.nblg || x.prix ? 2 : 1;
		return x;
	},

	normGac : function(x, ids){
		if (!x)
			x = {};
		x.cell = this;
		x.type = "Gac";
		x.id = ""; 
		x.nblg = x.nblg === undefined ? 0 : x.nblg;
		x.poids = x.poids === undefined ? 0 : x.poids;
		x.prix = x.prix === undefined ? 0 : x.prix;
		x.poidsC = x.poidsC === undefined ? 0 : x.poidsC;
		x.prixC = x.prixC === undefined ? 0 : x.prixC;
		x.poidsD = x.poidsD === undefined ? 0 : x.poidsD;
		x.prixD = x.prixD === undefined ? 0 : x.prixD;
		x.flags = x.flags === undefined ? 0 : x.flags;
		x.regltFait = x.regltFait === undefined ? 0 : x.regltFait;
		x.panierAtt = x.panierAtt === undefined ? 0 : x.panierAtt;
		x.db = x.db === undefined ? 0 : x.db;
		x.cr = x.cr === undefined ? 0 : x.cr;
		x.dbj = x.dbj === undefined ? 0 : x.dbj;
		x.crj = x.crj === undefined ? 0 : x.crj;
		x.remiseCheque = x.remiseCheque === undefined ? 0 : x.remiseCheque;
		x.cheque = x.cheque === undefined ? 0 : x.cheque;
		x.suppl = x.suppl === undefined ? 0 : x.suppl;
		x.status = x.nblg || x.prix || x.prixPG || x.poidsC || x.prixC
			|| x.cheque || x.suppl || x.db || x.cr || x.dbj || x.crj ? 2 : 1;
		return x;
	},

	normReduc : function(x, ids){
		if (!x)
			x = {};
		x.cell = this;
		x.type = "Reduc";
		x.id = ""; 
		x.reduc = x.reduc === undefined ? 0 : x.reduc;
		this.reduc = x.reduc;
		x.fraisgap0 = x.fraisgap0 === undefined ? 0 : x.fraisgap0;
		this.fraisgap0 = x.fraisgap0;
		return x;
	},

	updateNodes : function(nodes) {
		this.toSet = {};
		this.acToSet = {};
		if (!nodes)
			return;
		if (nodes.AcApPr) {
			for ( var ii = 0, x = null; x = nodes.AcApPr[ii]; ii++)
				this.storeAndPush(this.normAcApPr(x));
		}
		if (nodes.AcAp) {
			for ( var ii = 0, x = null; x = nodes.AcAp[ii]; ii++)
				this.storeAndPush(this.normAcAp(x));
		}
		if (nodes.Ac) {
			for ( var ii = 0, x = null; x = nodes.Ac[ii]; ii++) {
				this.storeAndPush(this.normAc(x));
			}
		}
		if (nodes.ApPr) {
			for ( var ii = 0, x = null; x = nodes.ApPr[ii]; ii++)
				this.storeAndPush(this.normApPr(x));
		}
		if (nodes.Ap) {
			for ( var ii = 0, x = null; x = nodes.Ap[ii]; ii++) {
				this.storeAndPush(this.normAp(x));
			}
		}
		if (nodes.Gac) {
			this.storeAndPush(this.normGac(nodes.Gac));
		}
		if (nodes.Reduc)
			this.storeAndPush(this.normReduc(nodes.Reduc));
	}
	
});

/*************************************************************/
