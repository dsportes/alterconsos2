/** ************************************************* */
AC.Sort = { 
	i : function(a, b) { return (a.initiales < b.initiales) ? -1 : (a.initiales > b.initiales ? 1 : 0); },
	t : function(a, b) { return (a.tri < b.tri) ? -1 : (a.tri > b.tri ? 1 : 0);	},
	et : function(a, b) { return (a.elt.tri < b.elt.tri) ? -1 : (a.elt.tri > b.elt.tri ? 1 : 0);	},
	l : function(a, b) {
		var au = a.label.toUpperCase();
		var bu = b.label.toUpperCase();
		return (au < bu) ? -1 : (au > bu ? 1 : 0);	
	},
	cl : function(a,b){
		if (!a.code) return -1;
		if (!b.code) return 1;
		var au = a.label.toUpperCase();
		var bu = b.label.toUpperCase();
		if (au < bu) return -1;
		if (au > bu) return 1;
		return 0;
	},
	n : function(a, b) { 
		if (!a.nom) {
			// console.log("??? : " + a.ap + "." + a.pr);
			return -1;
		}
		if (!b.nom) {
			// console.log("??? : " + b.ap + "." + b.pr);
			return 1;
		}
		var au = a.nom.toUpperCase();
		var bu = b.nom.toUpperCase();
		return (au < bu) ? -1 : (au > bu ? 1 : 0);	
	},
	num : function(a, b) { 
		return (a < b) ? -1 : (a > b ? 1 : 0);	
	},
	gac : function(a, b) {
		if (a.code == 1) return -1;
		if (b.code == 1) return 1;
		if (a.initiales < b.initiales) return -1;
		if (a.initiales == b.initiales)	return 0;
		return 1;
	},
	gap : function(a, b) {
		if (a.code == 1) return -1;
		if (b.code == 1) return 1;
		if (a.code < 100 && b.code >= 100) return -1;
		if (b.code < 100 && a.code >= 100) return 1;
		if (a.initiales < b.initiales) return -1;
		if (a.initiales == b.initiales)	return 0;
		return 1;
	},
	ex : function(a, b){
		if (a.expedition < b.expedition) return 1;
		if (b.expedition < a.expedition) return -1;
		return 0;
	}
		
}

/***********************************************/
AC.Message = {
	setup : function(){
		this._div = $("#messageDiv");
		this._inner = this._div.find(".inner");
		APP.oncl(this, this._div, this.hide);
	},
	
	info : function(msg){ 
		this.diag(msg, false); 
	},
	
  	error : function(msg){ 
  		this.diag(msg, true); 
  	},
  	
  	diag : function(msg, isRed){
		this.msg = msg ? msg.trim() : null;
	    if (!this.msg)
	      	return;
	    this._inner.css("color", isRed ? "red" : "black");
	    this._inner.css("font-weight", isRed ? "bold" : "normal");
	    this._inner.text(this.msg);
	    new AC.Timer(this, 0, null, function(){
	    	this._div.css("top", "0px");
	    });
	    this.cancel();
	    this.timer = new AC.Timer(this, isRed ? 6000 : 2000, null, this.hide);
  	},
  	
	hide : function(){
		this._div.css("top", "-80px");
    	this.msg = "";
    	this._inner.html("");
    	this.cancel();
	},
	
	cancel : function(){
	    if (this.timer)
	    	this.timer.cancel();
	    this.timer = null;
	}
}


/***********************************************/
AC.IconBar = {
		
	setup : function(){
		this.ready = true;
		this.items = "";
		this.lastClicked = null;
		this._iconBar = $("#iconBar");
		if (ISTOUCH) {
			this.icon = "icon";
			this._maskIB = $("#acMaskIB");
			AC.oncl(this, this._maskIB, function(){
				this._maskIB.css("display", "none");
				if (this.lastClicked)
					this.lastClicked.css("display", "none");
				this.lastClicked = null;
			});
			AC.oncl(this, this._iconBar, function(){
				this._maskIB.css("display", "none");
				if (this.lastClicked)
					this.lastClicked.css("display", "none");
				this.lastClicked = null;
			});
		} else
			this.icon = "iconh";
	},
	
	width : function(){
		return this.ready ? this._iconBar.width() : 0;
	},

	height : function(){
		return this.ready ? this._iconBar.height() : 600;
	},
	
	setStatus : function(){
		if (this.ready && this._syncLapse){
			var n1 = AC.Req.lapseFromLastSync();
			this._syncLapse.html(n1 == -1 ? "" : INT.editLapse(n1));
			if (!AC.Req.lastStatus)
				this._acBtnSync.addClass("acBarSyncRed");
			else
				this._acBtnSync.removeClass("acBarSyncRed");
		}
	},
	
	enableBack : function(enable){
		if (this.ready && this._acBack)
			Util.btnEnable(this._acBack, enable);
	},

	enableForward : function(enable){
		if (this.ready && this._acForward)
			Util.btnEnable(this._acForward, enable);
	},

	set : function(page, opt){
		var t = [];
		t.push({icon:"Aide", action:"aide", text:"Aide"});
        t.push({icon:"Sync", action:"sync", text:"Resynchroniser"});
        if (opt != 0) {
	        t.push({icon:"Perso", action:"monProfil", text:"Mon profil"});
	        if (APP.Ctx.authType == 1)
	        	t.push({icon:"Groupe", action:"monGroupe", text:"Mon groupe"});
	        else
		        t.push({icon:"Groupe", action:"monGroupement", text:"Mon groupement"});
	        t.push({icon:"Book", action:"grps", text:"Groupes et Groupements"});
        };
        t.push({icon:"Loupe", action:"about", text:"Préférences et information"});
        if (opt != 0)
        	t.push({icon:"Home", action:"home", text:"Retour à l'accueil"});
        t.push({icon:"Sortir", action:"quit", text:"Déconnexion / sortie"});
		this.setItems(page, t); 
	},
		
	setItems : function(page, items){
		this.page = page;
		var t = [];
		for(var i = 0, it = null; it = items[i]; i++){
			t.push("<div class='item' data-action='" + it.action + "'>");
			t.push("<div class='" + this.icon + " acsIcon" + it.icon + "' data-action='" + it.action + "'>");
			if (it.icon == "Sync")
				t.push("<div id='acBarSyncText' class='syncText small bold'>0s</div>");
			t.push("</div>");
			t.push("<div class='text' data-action='" + it.action + "'>" + it.text + "</div>");
			t.push("</div>");
		};
		this._iconBar.html(t.join(""));
		var self = this;
		AC.oncl(this, this._iconBar.find(".icon"), function(target){
			this._maskIB.css("display", "block");
			this.lastClicked = target.parent().find(".text");
			this.lastClicked.css("display", "block");
		});
		AC.oncl(this, this._iconBar.find(".iconh"), function(target){
			var action = this.getAction(target);
			this.doAction(action);
		});
		AC.oncl(this, this._iconBar.find(".text"), function(target){
			if (ISTOUCH) {
				this._maskIB.css("display", "none");
				target.css("display", "none");
			}
			this.doAction(this.getAction(target));
		});
		this._acBtnSync = this._iconBar.find(".acsIconSync");
		this._syncLapse = this._iconBar.find("#acBarSyncText");
	},
	
	getAction : function(t){
		var action = t.attr("data-action");
		if (!action)
			action = t.parent().attr("data-action");
		return action;
	},
	
	doAction : function(action){
		if (action == "sync") {
			AC.Req.sync();
			return;
		}
		if (this.page)
			this.page.onMenu(action);
	}
	
}

/***********************************************/
Date.prototype.format = function(format) {
	var fullYear = this.getYear();
	if (fullYear < 1000)
		fullYear = fullYear + 1900;
	var hour = this.getHours();
	var day = this.getDate();
	var month = this.getMonth() + 1;
	var minute = this.getMinutes();
	var seconde = this.getSeconds();
	var ms = this.getMilliseconds();
	var reg = new RegExp('(d|m|Y|H|i|s|S)', 'g');
	var replacement = new Array();
	replacement['d'] = day < 10 ? '0' + day : day;
	replacement['m'] = month < 10 ? '0' + month : month;
	replacement['S'] = ms < 10 ? '00' + ms : (ms < 100 ? '0' + ms : ms);
	replacement['Y'] = fullYear;
	replacement['H'] = hour < 10 ? '0' + hour : hour;
	replacement['i'] = minute < 10 ? '0' + minute : minute;
	replacement['s'] = seconde < 10 ? '0' + seconde : seconde;
	return format.replace(reg, function($0) {
		return ($0 in replacement) ? replacement[$0] : $0.slice(1, $0.length - 1);
	});
};

Date.prototype.hhmmss = function() { return this.format("His"); };

Date.prototype.aammjj = function(){	return parseInt(this.format("Ymd")); };

Date.prototype.stdFormat = function() { return this.format("Y-m-d H:i:s.S"); };

Date.prototype.fileNameFormat = function() { return this.format("_Ymd-His-S"); };

/************************************************************/

AC.AMJ = {
//		sysTime : function() { return new Date().getTime() - 18000000; },
		sysTime : function() { return new Date().getTime(); },

		qabs : [],
		
		nbsMax : 0,

		nbjMax : 2,

		nbjn : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
		
		nbjb : [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],

		tousMois : [],
		
		aujourdhui : 0,
		
		setup : function() {
			for(var a = 13; a < 99; a++){
				this.qabs.push([]);
				var qx = this.qabs[a - 13];
				for(var m = 0; m < 12; m++){
					qx.push(this.nbjMax);
					if (a % 4 == 0)
						this.nbjMax += this.nbjb[m];
					else
						this.nbjMax += this.nbjn[m];
				}
			}
			this.nbsMax = this.nbjMax / 7;
			
			this.getTime();
			
			var a = Math.floor(this.aujourdhui / 10000);
			var m = Math.floor((this.aujourdhui - (a * 10000)) / 100);
			if (m < 9){
				this.premierJour = ((a - 2) * 10000) + 901;
				this.dernierJour = ((a + 1) * 10000) + 831;
			} else {
				this.premierJour = ((a - 1) * 10000) + 901;
				this.dernierJour = ((a + 2) * 10000) + 831;	
			}
			this.tousMois.push(this.premierJour);
			for(var i = 0; i < 36; i++){
				var a = Math.floor(this.tousMois[i] / 10000);
				var m = Math.floor((this.tousMois[i] - (a * 10000)) / 100);
				if (m == 12)
					this.tousMois.push(((a + 1) * 10000) + 101);
				else
					this.tousMois.push((a * 10000) + ((m + 1) * 100) + 1);
			}
		},
		
		idxMois : function(aammjj){
			for(var i = 0; i < 36; i++){
				if (aammjj < this.tousMois[i])
					return i - 1;
			}
			return 36;
		},

		nbj : function(aammjj){ // nombre de jours écoulés depuis 121230 (121230 est 0 : c'est un dimanche)
			try {
				if (aammjj < 121230)
					return 0;
				var aa = Math.round(aammjj / 10000);
				var mm = Math.round(aammjj / 100) % 100;
				var jj = aammjj % 100;
				var q = this.qabs[aa - 13][mm - 1];
				return q + jj - 1;
			} catch (e) {
				return 0;
			}
		},
		
		diag : function(aammjj) {
			try {
				if (aammjj < 130101)
					return "La date doit être postérieure au 1er janvier 2013";
				if (aammjj > this.dernierJour)
					return "La date doit être antérieure à la fin du calendrier géré (" 
					+ this.dernierJour + ")";
				var aa = Math.round(aammjj / 10000);
				var mm = Math.round(aammjj / 100) % 100;
				if (mm < 1 || mm > 12)
					return "Le mois n'est pas compris entre 1 et 12";
				var jj = aammjj % 100;
				if (jj < 1 || jj > this.nbjb[mm - 1])
					return "Le mois n'est pas compris entre 1 et " + this.nbjb[mm - 1];
				return null;
			} catch (e) {
				return "Format de date incorrect";
			}
		},
		
		nbs : function(aammjj){ // nombre de semaines entières écoulées depuis 130101. 
			return Math.floor((this.nbj(aammjj) - 1 ) / 7);
		},
			
		js : function(aammjj){
			var js = this.nbj(aammjj) % 7;
			return js == 0 ? 7 : js;
		},
		
		aammjj : function(nbj, js){
			if (arguments.length != 1)
				return this.aammjj2(nbj, js)
			if (nbj <= 0)
				return 121230;
			if (nbj > this.nbjMax)
				return 991231;
			for(var a = 0; a < (99 - 13); a++){
				if (nbj < this.qabs[a + 1][0])
					for(var m = 11; m >= 0; m--){
						var q1 = this.qabs[a][m];
						if (nbj >= q1) {
							return ((a + 13) * 10000) + ((m + 1) * 100) + (nbj - q1 + 1);
						}
					}
			}
			return 991231;
		},
		
		aammjj2 : function(nbs, js){
			if (js < 1 || js > 7)
				js = 1;
			if (nbs < 0)
				nbs = 0;
			if (nbs > this.nbsMax)
				nbs = this.nbsMax;
			var nbj = (nbs * 7) + js;
			return this.aammjj(nbj);
		},
		
		jPlusN : function(amj, n) {
			return this.aammjj(this.nbj(amj) + n);
		},

		nbJourMois : function(aammjj) {
			var aa = Math.round(aammjj / 10000);
			var mm = Math.round(aammjj / 100) % 100;
			if (aa % 4 == 0)
				return this.nbjb[mm - 1];
			else
				return this.nbjn[mm - 1];
		},
				
		getTime : function() {
			if (ACSRV.simul) {
				if (!this.aujourdhui) {
					this.seconds = 0;
					this.aujourdhui = Math.floor(ACSRV.simul / 100);
					var h = ACSRV.simul % 100;
					var y = Math.floor(this.aujourdhui / 10000);
					var m = Math.floor((this.aujourdhui - (y * 10000)) / 100) - 1;
					this.ajhTime = new Date(y + 2000, m, this.aujourdhui % 100).getTime();
					this.ajhTime += h * 3600000;
				}
				this.ajhTime += this.seconds++ * 1000;
				return new Date(this.ajhTime);
			} else {
//				var now = new Date(ACSRV.localStartTime);
				var nx = AC.AMJ.sysTime();
				var now = new Date(nx - (APP.Ctx ? APP.Ctx.delta : 0));
				this.aujourdhui = ((now.getFullYear() % 100) * 10000) 
					+ ((now.getMonth() + 1) * 100) + now.getDate();
				return now;
			}
		},
		
		mois : ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre",
				"Novembre", "Décembre"],

		moisC : ["Janv.", "Fév.", "Mars", "Avril", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."],

		jours : ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"],

		joursLongs : ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],

		joursLongs2 : ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"],

		libjour : function(aammjj, flong) {
			// "Je 14" ou "Jeudi 14"
			var y = (aammjj % 100);
			if (y == 1)
				y = "1er";
			var j = AC.AMJ.js(aammjj) - 1;
			return (flong ? this.joursLongs[(j % 7)] : this.jours[(j % 7)]) + " " + y;
		},

		libmois : function(aammjj) {
			// "Novembre 2012"
			return this.mois[Math.floor(aammjj / 100) % 100 - 1] + " 20" + Math.floor(aammjj / 10000);
		},

		libmoisC : function(aammjj) {
			// "Nov.12"
			return this.moisC[Math.floor(aammjj / 100) % 100 - 1] + " " + Math.floor(aammjj / 10000);
		},

		libmoisD : function(aammjj) {
			// "Nov."
			return this.moisC[Math.floor(aammjj / 100) % 100 - 1];
		},

		dateCourte : function(aammjj) {
			return this.libjour(aammjj) + " " + this.libmois(aammjj);
		},

		dateTCourte : function(aammjj) {
			return this.libjour(aammjj) + " " + this.libmoisD(aammjj);
		},

		dateMCourte : function(aammjj) {
			return this.libjour(aammjj) + " " + this.libmoisC(aammjj);
		},

		dateLongue : function(aammjj) {
			return this.libjour(aammjj, true) + " " + this.libmois(aammjj);
		},

		genMois : function(t, aammjj) {
			var jj = aammjj % 100;
			var yy = Math.round(aammjj / 10000);
			var mm = Math.round(aammjj / 100) % 100;
			
			var dpj = (yy * 10000) + (mm * 100) + 1;
			var pj = AC.AMJ.js(aammjj) - 1;
			var nj = AC.AMJ.nbJourMois(aammjj);
			
			t.append("<div class='calm' data-aamm='" + (yy * 100 + mm) + "'>");
			var lib = AC.AMJ.mois[mm - 1] + " " + (yy + 2000);
			t.append("<div class='caln'>" + lib + "</div>");
			t.append("<div class='calst'>");
			var x = 1;
			var y = "";
			var c = "";
			var av = true;
			var ap = false;
			var der = false;
			for ( var j = 0; j < 7; j++) {
				c = j == 0 ? "0'>" + AC.AMJ.jours[0] : "'>" + AC.AMJ.jours[j];
				t.append("<div class='caljn" + c + "</div>");
			}
			t.append("</div>");
			for ( var i = 0; i < 6; i++) {
				t.append("<div class='cals'>");
				for ( var j = 0; j < 7 && x <= nj; j++) {
					av = i == 0 && pj > j;
					ap = x > nj;
					der = x == nj;
					y = (!av && !ap) ? " data-aammjj='" + dpj++ + "'>" : ">";
					y += "<div class='calx'>" + ((!av && !ap) ? "" + x++ : "&nbsp;") + "</div>";
					if (av || (j == 0 && !der))
						t.append("<div class='cal calj0'" + y + "</div>");
					else {
						if (j == 0) // der
							t.append("<div class='cal calj8'" + y + "</div>");
						else if (j == 6)
							t.append("<div class='cal calj'" + y + "</div>");
						else if (der)
							t.append("<div class='cal calj9'" + y + "</div>");
						else
							t.append("<div class='cal calj'" + y + "</div>");
					}
				}
				t.append("</div>");
			}
			t.append("</div>");
			return {aa : yy, mm : mm, jj : jj}
		}

}

Util = {
	editTaux : function(s) {
		try {
			var y = s ? JSON.parse(s) : [];
		} catch (e) { var y = [];}
		if (y.length == 0)
			return "Taux applicable : 0%";
		var sb = new StringBuffer();
		sb.append("Taux applicables<br>");
		sb.append("0% avant " + AC.AMJ.dateCourte(y[0].date) + "<br>");
		for(var i = 0, z = null; z = y[i]; i++){
			sb.append("" + z.taux + "% à partir de " + AC.AMJ.dateCourte(z.date) + "<br>");			
		}
		return sb.toString();
	},

	adresse : function(ad){
		var sb = new StringBuffer();
		if (ad) {
			sb.append("<div><a class='acMapsBtn3' target='_blank' href=\"http://maps.google.com/maps?q=");
			sb.append(encodeURIComponent(ad));
			sb.append("\">");
			sb.append(ad.escapeHTML());
			sb.append("</a></div>");
		}
		return sb.toString();
	},

	adresse2 : function(elt, sl){
		var adl = sl.adresseL ? sl.adresseL : elt.localisation;
		var add = sl.adresseD ? sl.adresseD : elt.localisation;
		if (!adl && !add)
			return "<div>Lieux de déchargement / distribution non renseignés</div>";
		var sb = new StringBuffer();
		if (adl == add) {
			sb.append("<div>");
			sb.append(adl.escapeHTML());
			sb.append("<a class='acMapsBtn4' target='_blank' href=\"http://maps.google.com/maps?q=");
			sb.append(encodeURIComponent(adl));
			sb.append("\"></a></div>");
		} else {
			if (adl) {
				sb.append("<div>Déchargement : ");
				sb.append(adl.escapeHTML());
				sb.append("<a class='acMapsBtn4' target='_blank' href=\"http://maps.google.com/maps?q=");
				sb.append(encodeURIComponent(adl));
				sb.append("\"></a></div>");
			} else
				sb.append("<div>Déchargement : lieu non renseignée</div>");
			if (add) {
				sb.append("<div>Distribution : ");
				sb.append(add.escapeHTML());
				sb.append("<a class='acMapsBtn4' target='_blank' href=\"http://maps.google.com/maps?q=");
				sb.append(encodeURIComponent(add));
				sb.append("\"></a></div>");
			} else
				sb.append("<div>Distribution : lieu non renseignée</div>");				
		}
		return sb.toString();
	},

	mondayOfaammjj : function(aammjj){
		var s1 = AC.AMJ.nbs(aammjj);
		return AC.AMJ.aammjj2(s1, 1);
	},

	min : -999999999,
	
	text : function(cont, v){
		cont.text(v);
		return v;
	},

	html : function(cont, v){
		cont.html(v);
		return v;
	},
	
	dataIndex : function(target, index){
		var at = !index ? "data-index" : "data-" + index;
		var di = null;
		var t = target;
		while (t && t.length != 0 && !(di = t.attr(at)))
			t = t.parent();
		if (!di)
			return Util.min;
		return parseInt(di, 10);
	},
	
	opacity1 : function(target){
		target.css("opacity", 1);
		target.css("filter", "alpha(opacity=100)")
	},

	opacity0 : function(target){
		target.css("opacity", 0);
		target.css("filter", "alpha(opacity=0)")
	},

	opacity03 : function(target){
		target.css("opacity", 0.3);
		target.css("filter", "alpha(opacity=30)")
	},
	
	BoolEqual : function(arg1, arg2){
		var a = arg1 ? true : false;
		var b = arg2 ? true : false;
		return a == b;
	},
	
	ArrayEqual : function(arg1, arg2){
		if ((arg1 && !arg2) || (!arg1 && arg2))
			return false;
		if (!arg1 && !arg2)
			return true;
		if (arg1.length != arg2.length)
			return false;
		for ( var i = 0; i < arg1.length; i++)
			if (!(arg1[i] === arg2[i]))
				return false;
		return true;
	},

	SortedArrayEqual : function(arg1, arg2){
		if ((arg1 && !arg2) || (!arg1 && arg2))
			return false;
		if (!arg1 && !arg2)
			return true;
		if (arg1.length != arg2.length)
			return false;
		var a1 = [];
		var a2 = [];
		for(var i= 0; i < arg1.length; i++) a1.push(arg1[i]);
		for(var i= 0; i < arg2.length; i++) a2.push(arg2[i]);
		a1.sort(AC.Sort.num);
		a2.sort(AC.Sort.num);
		for ( var i = 0; i < a1.length; i++)
			if (!(a1[i] === a2[i]))
				return false;
		return true;
	},

	ArraySameContent : function(arg1, arg2) {
		if ((arg1 && !arg2) || (!arg1 && arg2))
			return false;
		if (!arg1 && !arg2)
			return true;
		if (arg1.length != arg2.length)
			return false;
		for ( var i = 0; i < arg1.length; i++) {
			var x = arg1[i];
			var j = arg2.indexOf(x);
			if (j == -1)
				return false;
		}
		for ( var i = 0; i < arg2.length; i++) {
			var x = arg2[i];
			var j = arg1.indexOf(x);
			if (j == -1)
				return false;
		}
		return true;
	},

	mapEqual : function(a, b) {
		if (!a || !b)
			return !a && !b;
		for ( var c in a) {
			if (typeof c === 'object' && c instanceof Array) {
				if (!Util.ArraySameContent(c, b[c]))
					return false;
			} else {				
				if (c != b[c])
					return false;
			}
		}
		for ( var c in b) {
			if (typeof c === 'object' && c instanceof Array) {
				if (!Util.ArraySameContent(c, a[c]))
					return false;
			} else {				
				if (c != a[c])
					return false;
			}
		}
		return true;
	},

	isEmpty : function(map) {
		if (!map)
			return true;
		for ( var x in map)
			return false;
		return true;
	},

	isEnable : function(cmp) {
		if (!cmp)
			return false;
		return !cmp.hasClass('ui-disabled');
	},

	btnEnable : function(cmp, enable) {
		if (!cmp)
			return enable;
		if (enable)
			cmp.removeClass('ui-disabled');
		else
			cmp.addClass('ui-disabled');
		return enable;
	},

	checkInitiales : function(val) {
		if (!val)
			return null;
		if (val.length > 5 || val.length < 2)
			return "Les initiales ont entre 2 et 5 caractères";
		for ( var i = 0; i < val.length; i++) {
			var c = val.charAt(i);
			if (i == 0)
				var ok = (c >= 'A' && c <= 'Z');
			else
				var ok = (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
			if (!ok) {
				return "Caractères autorisés : A à Z et 0 à 9 (le premier étant une lettre)";
			}
		}
		return null;
	},

	checkPwd : function(x, i) {
		var l = i ? "Le mot de passe #" + i : "Le mot de passe";
		if (x && x.startsWith("0"))
			return l + " ne doit pas commencer par \"0\"";
		if (!x || x.length < 4)
			return l + " doit avoir plus de 3 caractères";
		return null;
	},

	getScroll : function() {
		var x = 0, y = 0;
		if (typeof (window.pageYOffset) == 'number') {
			// Netscape compliant
			y = window.pageYOffset;
			x = window.pageXOffset;
		} else if (document.body && (document.body.scrollLeft || document.body.scrollTop)) {
			// DOM compliant
			y = document.body.scrollTop;
			x = document.body.scrollLeft;
		} else if (document.documentElement
				&& (document.documentElement.scrollLeft || document.documentElement.scrollTop)) {
			// IE6 standards compliant mode
			y = document.documentElement.scrollTop;
			x = document.documentElement.scrollLeft;
		}
		var obj = new Object();
		obj.x = x;
		obj.y = y;
		return obj;
	},
	
	editSuppr2 : function(suppr) {
		if (!suppr) return "";
		return "<span class='bold red'>" + Util.editSuppr(suppr) + "</span>";
	},
	
	editSuppr : function(suppr) {
		if (!suppr) return "";
		var s = "" + suppr;
		var aa = s.substring(0, 2);
		var mm = s.substring(2, 4);
		var jj = s.substring(4, 6);
		return " [Résiliation le " + jj + "/" + mm + "/20" + aa + "] ";
	},

	editEltT : function(elt){
		if (!elt) return "???";
		return elt.initiales + " - " + Util.editEltT2(elt); 
	},

	editEltT2 : function(elt){
		if (!elt) return "???";
		var n = elt.nom ? elt.nom : (elt.label ? elt.label : "?");
		return n.escapeHTML() + Util.editSuppr(elt.suppr); 
	},

	editEltH : function(elt){
		if (!elt) return "???";
		return elt.initiales + " - " + Util.editEltHS(elt); 
	},

	editEltHS : function(elt){
		if (!elt) return "???";
		var n = elt.nom ? elt.nom : (elt.label ? elt.label : elt.initiales);
		return n.escapeHTML() + Util.editSuppr2(elt.suppr); 
	}
		
}

/** ************************************************* */
INT = {
	editLapse: function(s){
		var m = Math.floor(s / 60);
		s = s % 60;
		if (m == 0)
			return "" + s + "s";
		var h = Math.floor(m / 60);
		m = m % 60;
		if (h == 0)
			return "" + m + "m" + "" + s;
		var j = Math.floor(h / 24);
		h = h % 24;
		if (j == 0)
			return "" + h + "h" + "" + m ;
		return "" + j + "j" + "" + h + "h" ;
	},

	demi : function(n){
		var r = n % 2;
		var q = Math.floor(n / 2);
		if (r)
			return "" + q + ",5";
		else
			return "" + q;
	},
	
	edit3 : function(ms) {
		ms = ms % 1000;
		return (ms < 10 ? '00' + ms : (ms < 100 ? '0' + ms : '' + ms));
	},

	edit2 : function(ms) {
		ms = ms % 100;
		return (ms < 10 ? '0' + ms : '' + ms);
	},

	editN : function(d, n) {
		var s = "" + n;
		if (s.length == d)
			return s;
		if (s.length > d)
			return s.substring(0, d);
		var z = "00000000000";
		return z.substring(0, (d - s.length)) + s;
	},

	editX2 : function(p) {
		if (p < 0)
			return "<span class='boldB' style='color:red'>Nombre incorrect</span>";
		return "";
	},

	editKg : function(p) {
		if (!p)
			return "0Kg";
		if (p < 0)
			return "<span class='bold' style='color:red'>Nombre incorrect</span>";
		var k = Math.floor(p / 1000);
		var g = Math.floor(p % 1000);
		if (k == 0)
			return "" + g + "g";
		if (g != 0) {
			if (g % 100 == 0)
				return "" + k + "," + Math.floor(g / 100) + "Kg";
			else
				return "" + k + "," + INT.edit3(g) + "Kg";
		} else
			return "" + k + "Kg";
	},

	editKgA : function(p) {
		if (!p)
			return "0Kg";
		if (p < 0)
			return "<span class='bold' style='color:red'>Nombre incorrect</span>";
		var k = Math.round(p / 1000);
		return p >= 1000 ? "" + k + "Kg" : "" + p + "g";
	},

	editES : function(m) {
		return m < 0 ? "-" + INT.editE(-m) : INT.editE(m); 
	},
	
	editE : function(m) {
		if (!m)
			return "0€";
		if (m < 0)
			return "<span class='bold' style='color:red'>Nombre incorrect</span>";
		var e = Math.floor(m / 100);
		if (m == 0)
			return "0€";
		var c = Math.floor(m % 100);
		if (c == 0)
			return "" + e + "€";
		if (e == 0)
			return "0," + INT.edit2(c) + "€";
		else
			return "" + e + "," + INT.edit2(c) + "€";
	},

	editD0 : function(s){
		return INT.editD(0, s);
	},

	editD2 : function(s){
		return INT.editD(2, s);
	},

	editD3 : function(s){
		return INT.editD(3, s);
	},

	editD : function(d, n) {
		if (n == null || n == 0)
			return "";
		var s = "" + n;
		if (typeof n != "number" || d <= 0 || s < 0)
			return s;
		if (s.length <= d)
			return "0," + "000000000".substring(9 -(d - s.length)) + s;
		var dec = s.substring(s.length - d);
		var ent = s.substring(0, s.length - d);
		if (dec == "000000000".substring(0, d))
			return ent;
		return ent + "," + dec;
	},

	Str2N0 : function(s){
		return INT.Str2N(0, s);
	},

	Str2N1 : function(s){
		return INT.Str2N(1, s);
	},
	
	Str2N2 : function(s){
		return INT.Str2N(2, s);
	},
	
	Str2N3 : function(s){
		return INT.Str2N(3, s);
	},

	Str2N : function(d, s) {
		if (s === undefined || s === null)
			return null;
		if (s === "")
			return 0;
		var s2 = s.replace(",", ".");
		var i = -1;
		for ( var x = 0; x < s2.length; x++) {
			var y = s2.charAt(x);
			if (y == ".") {
				if (i != -1)
					return -1;
				i = x;
			} else if (y < "0" || y > "9")
				return -1;
		}
		var n = parseFloat(s2);
		if (isNaN(n))
			return -1;
		var k = 1;
		for ( var i = 0; i < d; i++)
			k = k * 10;
		var n = n * k;
		return Math.round(n);
	}

}

/** ************************************************* */
String.prototype.isNumber = function(){return /^\d+$/.test(this);}

String.prototype.startsWith = function(str) {
	return (!str || (this.length >= str.length && this.substring(0, str.length) == str));
}

String.prototype.endsWith = function(str) {
	return (!str || (this.length >= str.length && this.substring(this.length - str.length) == str));
}

String.prototype.escapeHTML = function() {
	return this.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split("\n").join("<br>");
}

String.prototype.escapeHTMLAttr = function() {
	return this.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split("\n").join("<br>")
			.split("\'").join("&apos;").split("\"").join("&quot;");
}

String.prototype.unescapeHTML = function() {
	var temp = document.createElement("div");
	temp.innerHTML = this;
	var result = temp.childNodes[0].nodeValue;
	temp.removeChild(temp.firstChild);
	return result;
}

String.prototype.str2aammjj = function(str) {
	if (!str || str.length != 6)
		return 0;
	try {
		var aa = parseInt(str.substring(0, 2), 10);
		var mm = parseInt(str.substring(2, 4), 10);
		var jj = parseInt(str.substring(4, 6), 10);
		if (aa < 10)
			return 0;
		if (mm < 1 || mm > 12)
			return 0;
		if (jj < 1)
			return 0;
		var mx = [31, 28 + ((aa % 4) == 0 ? 1 : 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
		if (jj > mx[mm - 1])
			return 0;
		return (aa * 10000) + (mm * 100) + jj;
	} catch (e) {
		return 0;
	}
}

/** ************************************************* */
