/*****************************************************/
AC.ac2 = function(){}
AC.ac2._static = {
	detail : true,
	euro : {},
	nomPhases : ["pas encore ouverte aux commandes", "ouverte aux commandes",
	             "en chargement ou en transport", "en déchargement / distribution des paniers",
	             "archivée"]
}
AC.ac2._proto = {
	className : "ac2",
	
	init : function(nom) {
		this.nom = "ac2";
		AC.Page.prototype.init.call(this, nom);
		return this;
	},

	open : function() {
		AC.Page.prototype.open.call(this);
		AC.IconBar.set(this, 1);
		
		APP.Ctx.currentDate = APP.Ctx.authDate ? APP.Ctx.authDate : 0;
		APP.oncl(this, APP._acBarPhoto, function(){
			this.onMenu("monProfil");
		});
		APP.oncl(this, APP._identite, function(){
			this.onMenu("monProfil");
		});
		APP._acBarPhoto.css("cursor", "pointer");
		
		AC.ac2.viewLV = APP.Ctx.authType == 1 ? new AC.LV1() : new AC.LV2();
		AC.ac2.viewLV.init();
	},
	
	onMenu : function(action){
		switch (action) {
		case 'aide' : {
			AC.Help.gotoHelp("home");
			return;
		}
		case 'home' : {
			APP.goHome();
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
		case 'monProfil' : {
			if (APP.Ctx.authUsr)
				AC.StackG.show({type:["","Ac","Ap"][APP.Ctx.authType],  
					gac:APP.Ctx.loginGrp.code, 
					gap:APP.Ctx.loginGrp.code, 
					ac:(APP.Ctx.authType == 1 ? APP.Ctx.authUsr : 0),
					ap:(APP.Ctx.authType == 2 ? APP.Ctx.authUsr : 0)});
			else
				AC.StackG.show({type:["","Ac","Ap"][APP.Ctx.authType], 
					gac:APP.Ctx.loginGrp.code, 
					gap:APP.Ctx.loginGrp.code,
					ac:(APP.Ctx.authType == 1 ? 1 : 0),
					ap:(APP.Ctx.authType == 2 ? 1 : 0)});			
			return;
		}
		case 'monGroupe' : {
			AC.StackG.show({type:["","Gac","Gap"][APP.Ctx.authType],
				gac:APP.Ctx.loginGrp.code});
			return;
		}
		case 'monGroupement' : {
			AC.StackG.show({type:["","Gac","Gap"][APP.Ctx.authType], 
				gap:APP.Ctx.loginGrp.code});
			return;
		}
		case 'grps' : {
			AC.StackG.show({type:"Dir", option:{choice:["","lstGac","lstGap"][APP.Ctx.authType]}});
			return;
		}
		}
		AC.info("Item : " + action);
	},
		
	close : function(cb){
		if (AC.ac2.viewLV)
			AC.ac2.viewLV.close();
		AC.ac2.viewLV = null;
		APP._acBarPhoto.css("cursor", "none");
		AC.StackG.close();
		AC.Stack.close();
		APP._bottom.html("");
		AC.Page.prototype.close.call(this, cb);
	}
			
}
AC.declare(AC.ac2, AC.Page);

/****************************************************************/
AC.Cpt = function(){}
AC.Cpt._static = {
	register : function(_cont){
		AC.oncl(this, _cont.find(".v2Cpt"), function(target){
			var ro = target.hasClass("v2RO");
			var key = target.attr("data-cellkey");
			var id = target.attr("data-objid");
			var cell = AC.Cell.get(key);
			if (!cell || !cell.store)
				return;
			var x = cell.get(id);
			if (ro) {
				new AC.CptZoom().init(x);
				return;
			}
			if (!AC.ac2.viewDT)
				return;
			var cb = AC.ac2.viewDT["on" + x.type];
			if (!cb)
				return;
			cb.call(AC.ac2.viewDT, x);
		});		
	},
	
	paniers : function(x) {
		var rf = x.regltFait;
		var pa = x.panierAtt;
		var phase = x.cell.phase(x);
		var p = "";
		if ((rf || pa) && phase >= 3){
			if (rf) {
				p += "<span class='bold vert'>" + rf ;
				if (rf > 1)
					p += " paniers retirés</span>";
				else
					p += " panier retiré</span>";
				if (pa)
					p += "<span class='bold orange'> sur " + (pa + rf) + "</span>";
			} else {
				p += "<span class='bold orange'>" + pa ;
				if (pa > 1)
					p += " paniers à retirer</span>";
				else
					p += " panier à retirer</span>";
			}
		}
		return p;
	}

}
AC.Cpt._proto = {
	className : "Cpt",

	init : function(t, x, option, maskFlags){
		this.option = option ? option : "";
		this.maskFlags = maskFlags ? maskFlags : null;
		var passive = this.option.indexOf("-p") != -1;
		this.x = x;
		this.t = t;
		var s1 = (passive ? "' " : " v2RO' ");
		var s2 = "";
		if (x.cell) {
			this.phase = x.cell.phase(x);
			this.pd = x.prod ? x.cell.prodDescr(x) : null; // {pd: , cv: }
			var s2 = " data-cellkey='" + x.cell.key + "' data-objid='" + x.type + "_" + x.id + "' ";
		}
						
		var s3 = " data-option='" + this.option + "' ";
		this.t.append("<div class='v2Cpt" + s1 + s2 + s3 + ">");
		var f = this["ed" + this.x.type];
		if (f)
			f.call(this);
		else
			this.t.append("!!!!! " + this.x.type + " !!!! ");
		this.t.append("</div>");
		return this;
	},
		
	edSGAp : function(){
		this.edGac();
	},

	edAp : function(){
		this.edFlags();
		this.t.append("<div>");
		this.editNblg().editPrixSupplPoids();
		this.t.append("</div>");
		if (this.phase >= 3) {
			this.t.append("<div>");
			this.editReglAtt().editCrDb();
			this.t.append("</div>");
		}
	},

	edGac : function(){
		this.edFlags();
		this.t.append("<div>");
		this.editNblg().editPrixSupplPoids();
		this.t.append("</div>");
		if (this.phase >= 3) {
			this.t.append("<div>");
			this.editReglAtt().editCrDbJ();
			this.t.append("</div>");
		}
	},

	edAc : function(){
		this.edSGAc();
	},
	
	edSGAc : function(){
		this.edFlags();
		this.t.append("<div>");
		this.editNblg().editPrixSupplPoids();
		this.t.append("</div>");
		if (this.phase >= 3) {
			this.t.append("<div>");
			this.editReglAtt().editCrDb();
			this.t.append("</div>");
		}
	},

	edSG : function(){
		this.edGac();
	},

	edFlags : function(){
		this.t.append("<div class='v2Flags'>");
		this.t.append(AC.Flag.printBox(this.x.flags, this.maskFlags));
		this.t.append("</div>");
	},
		
	editReglAtt : function(){
		var p = AC.Cpt.paniers(this.x);
		if (!p) 
			p = "&nbsp;";
		this.t.append("<div class='v2Qte'>" + p + "</div>");
		return this;
	},
	
	editCrDb : function(){
		var db = this.x.db;
		var cr = this.x.cr;
		var crx = cr ? "<span class='orange bold'>CR: " + INT.editE(cr) + "</span>" : "";
		var dbx = db ? "<span class='orange bold'>DB: " + INT.editE(db) + "</span>" : "";
		this.t.append("<div class='v2Prix'>" + crx + "</div>");
		this.t.append("<div class='v2Prix'>" + dbx + "</div>");
	},

	editCrDbJ : function(){
		var db = this.x.db + this.x.dbj;
		var cr = this.x.cr + this.x.crj;
		var crx = cr ? "<span class='orange bold'>CR: " + INT.editE(cr) + "</span>" : "";
		var dbx = db ? "<span class='orange bold'>DB: " + INT.editE(db) + "</span>" : "";
		this.t.append("<div class='v2Prix'>" + crx + "</div>");
		this.t.append("<div class='v2Prix'>" + dbx + "</div>");
	},

	editNblg : function(){
		if (this.x.nblg > 1)
			this.t.append("<div class='v2Qte'>" + this.x.nblg + " lignes</div>");
		else
			this.t.append("<div class='v2Qte'>" + this.x.nblg + " ligne</div>");
		return this;
	},

	editPrixSupplPoids : function(){
		this.t.append("<div class='v2Prix'><b>" + INT.editES(this.x.prix + this.x.suppl) + "</b></div>");
		var p = this.x.poids;
		if (p >= 100000)
			p = Math.round(p / 1000) * 1000;
		this.t.append("<div class='v2Poids'>" + INT.editKg(p) + "</div>");
	}

}
AC.declare(AC.Cpt);

/****************************************************************/
AC.CptEdit = function(){}
AC.CptEdit._static = {}
AC.CptEdit._proto = {
	className : "CptEdit",

	init : function(sb, x){
		this.name = "ZOOM_" + x.type;
		this.x = x;
		this.phase = x.cell.phase(x);
		this.sb = sb;
		// this.first = true;
		this.nbr = 0;
		APP.colorPaire = true;
		return this;
	},
	
	all : function(flag){
		var f = this["ed" + this.x.type];
		if (f)
			f.call(this);
		else
			this.sb.append("!!!!! " + this.x.type + " !!!! ");
		this.editPaniers();
		if (flag)
			this.editFlags();
		this.close();
		return this;
	},

	editFlags : function(){
		var f = AC.Flag.print1B(this.x.flags, AC.Flag.ALL, 2);
		this.editRow(f, "");
	},

	edAc : function(){
		this.editNblgPrixPoids();
		return this;
	},
	
	edSGAc : function(){
		if (APP.Ctx.authUsr)
			this.editNblgPrixPoids()
		this.editSCheque("émis").editSSuppl().editSPour().editDbCr();
		return this;
	},

	edGac : function(){
		this.editCD().editNblgPrixPoids().editSCheque("émis").editSSuppl().editDbCrJ();
		return this;
	},

	edSGAp : function(){
		this.editCD().editNblgPrixPoids().editSCheque("reçus").editSSuppl().editDbCrJ();
		return this;
	},

	edAp : function(){
		this.editCD().editNblgPrixPoids().editSCheque("reçus").editSSuppl().editDbCr();
		return this;
	},

	edSG : function(){
		return this.edGac();
	},
			
	editRow : function(text, cpt, cp){
		if (!this.nbr)
			this.sb.append("<div class='tableA'>");
		this.sb.append("<div class='trA" + (this.nbr % 2) + "'>");
		this.sb.append("<div class='tdA width90'>");
		this.sb.append(text);
		this.sb.append("</div><div class='tdB'><div class='v2CptB'>");
		this.sb.append(cpt);
		this.sb.append("</div></div></div>");
		this.nbr++;
	},

	close : function(){
		this.sb.append("</div>");
	},
	
	editRowC : function(text, cpt){
		this.editRow(text, cpt, "compta");
	},
	
	editRowP : function(text, cpt){
		this.editRow(text, cpt, "produit");
	},
	
	editPaniers : function(){
		var p = AC.Cpt.paniers(this.x);
		if (!p) 
			return this;
		
		var cg = this.x.cell.getCellGap(this.x);
		var tx = "";
		if (cg && cg.version != -1){
			if (this.x.ac) { // PAS mono sinon au-dessus
				if (cg.aPD() && !cg.aPG())
					tx = "Un panier par producteur. ";
				else
					tx = "Un panier par producteur et un pour le groupement. ";
			} else {
				if (cg.estMono())
					tx = "Un panier par alterconso. ";
				else {
					if (cg.aPD() && !cg.aPG())
						tx = "Par alterconso, un panier par producteur. ";
					else
						tx = "Par alterconso, un panier par producteur et un pour le groupement. ";
				}
			}
		} else {
			if (this.x.ac)
				var tx = "Un panier par producteur payé directement et un par groupement payant ses producteurs. ";
			else
				var tx = "Par alterconso, un panier par producteur payé directement et un par groupement payant ses producteurs. ";				
		}
		this.editRow(tx, p);
		return this;
	},
	
	editNblgPrixPoids : function() {
		var x = this.x;
		if (!x.nblg && !(x.prix + x.suppl) && !x.poids)
			return this;
		var z = "<div class='v2Qte'>" + x.nblg + (x.nblg > 1 ? " lignes</div>" : " ligne</div>") 
			+ "<div class='v2Prix'>" + INT.editES(x.prix + x.suppl) + "</div>"
			+ "<div class='v2Poids'>" + INT.editKg(x.poids) + "</div>";
		this.editRow("Total du nombre lignes de commandes, des montants et suppléments, des poids des produits", z);
		return this;
	},

	editCD : function() {
		var x = this.x;
		if (x.prixC || x.poidsC && (x.prixC != x.prixD && x.poidsC != x.poidsD))
			this.editRowP("Montant et poids des produits livrés, ", 
				"<div class='v2Qte'></div><div class='v2Prix'>" 
				+ INT.editE(x.prixC) + "</div><div class='v2Poids'>" + INT.editKg(x.poidsC) + "</div>");
		if (x.prixD || x.poidsD)
			this.editRowP("Montant et poids des produits reçus, ", 
				"<div class='v2Qte'></div><div class='v2Prix'>" 
				+ INT.editE(x.prixD) + "</div><div class='v2Poids'>" + INT.editKg(x.poidsD) + "</div>");
		return this;
	},

	editSSuppl : function() {
		var x = this.x
		if (!x.suppl)
			return this;
		if (x.suppl < 0)
			this.editRowC("Balance globale des suppléments(S) / avoirs(A)", 
				"<div class='v2Qte'></div><div class='v2Prix'></div><div class='v2Prix'>-" 
					+ INT.editE(-x.suppl) + " A</div>");
		else
			this.editRowC("Balance globale des suppléments(S) / avoirs(A)", 
				"<div class='v2Qte'></div><div class='v2Prix'>+" 
					+ INT.editE(x.suppl) + " S</div>");
		return this;
	},

	editSCheque : function(opt) {
		var x = this.x
		if (!x.cheque)
			return this;
		this.editRowC("Somme des montants des chèques " + opt, 
			"<div class='v2Qte'></div><div class='v2Prix'></div><div class='v2Prix'>" + INT.editE(x.cheque) + "</div>");
		return this;
	},

	editDbCr : function() {
		var x = this.x;
		if (!x.db && !x.cr)
			return this;
		var crx = x.cr ? "<span class='orange bold'>" + INT.editE(x.cr) + " CR</span>" : "-";
		var dbx = x.db ? "<span class='orange bold'>" + INT.editE(x.db) + " DB</span>" : "-";
		this.editRowC("Balance globale ", 
				"<div class='v2Qte'></div><div class='v2Prix'>" + crx 
				+ "</div><div class='v2Prix'>" + dbx + "</div>");
		return this;
	},

	editDbCrJ : function() {
		var x = this.x;
		if (x.db || x.cr) {
			var crx = x.cr ? "<span class='orange bold'>" + INT.editE(x.cr) + " CR</span>" : "-";
			var dbx = x.db ? "<span class='orange bold'>" + INT.editE(x.db) + " DB</span>" : "-";
			this.editRowC("Somme des soldes débiteurs / créditeurs SANS justifications", 
				"<div class='v2Qte'></div><div class='v2Prix'>" + crx
				+ "</div><div class='v2Prix'>" + dbx + "</div>");
		}
		if (x.dbj || x.crj) {
			var crx = x.crj ? "<span class='orange bold'>" + INT.editE(x.crj) + " CR</span>" : "-";
			var dbx = x.dbj ? "<span class='orange bold'>" + INT.editE(x.dbj) + " DB</span>" : "-";
			this.editRowC("Somme des soldes débiteurs / créditeurs AVEC justifications", 
				"<div class='v2Qte'></div><div class='v2Prix'>" + crx
				+ "</div><div class='v2Prix'>" + dbx + "</div>");
		}
		return this;
	},

	editSPour : function() {
		var x = this.x;
		if (!x.payePour && !x.payePar)
			return this;
		this.editRowC("Sommes des montants payés POUR des amis et payés PAR des amis", 
			"<div class='v2Qte'></div><div class='v2Prix'>" + INT.editES(x.payePour) 
			+ "</div><div class='v2Prix'>" + INT.editE(x.payePar) + "</div>");
		return this;
	}

}
AC.declare(AC.CptEdit);

/****************************************************************/
AC.CptZoom = function(){}
AC.CptZoom._static = {}
AC.CptZoom._proto = {
	className : "CptZoom",
	
	init : function(x){
		var sb = new StringBuffer();
		sb.append("<div class='acDivScroll'>");
		new AC.CptEdit().init(sb, x).all(true);
		sb.append("</div>");
		var ti = "Détail des compteurs et alertes";
		AC.SmallScreen.prototype.init.call(this, 800, sb.toString(), null, true, ti);
		this._help.css("display", "none");
		this.show();
	}

}
AC.declare(AC.CptZoom, AC.SmallScreen);

/****************************************************************/
AC.edAcApPr = function(x, m, pd, cv, reduc){
	this.x = x;
	this.m = m;
	this.pd = pd;
	this.cv = cv;
	this.reel = x && x.status == 2;
	// this.parDemi = this.pd.type == 3 && this.pd.parDemi;
	this.nouveau = (!x || x.status != 2) && m;
	this.qs = this.reel && this.x.qteS ? this.x.qteS : 0;
	this.qi = this.reel && this.x.qte ? this.x.qte : 0;
	this.prefi = cv.poids;
	this.prefc = this.prefi;
	var r = reduc === undefined ? (this.x && this.x.cell ? this.x.cell.reduc : 0) : reduc ;
	this.convi = new AC.Conv(this.pd, this.cv, r);
	this.conv = new AC.Conv(this.pd, this.cv, r);
	switch (pd.type) {
	case 1 : {
//		this.qed = true;
		this.ped = false;
		this.preel = false;
		this.pi = this.convi.q2p(this.qi).res;
		this.mi = this.convi.q2e(this.qi).res;
		this.qc = m && !(m.qte === undefined) ? m.qte : this.qi;
		this.pc = this.conv.q2p(this.qc).res;
		this.mc = this.conv.q2e(this.qc).res;		
		break;
	}
	case 2 : {
		this.srcLp = false;
		this.lpqi = 0;
		this.lpqc = 0;
		if (m && m.lprix) m.lprix.sort(AC.Sort.num);
		if (x && x.lprix) x.lprix.sort(AC.Sort.num);
		this.lped = m && m.lprix && x && !Util.ArrayEqual(m.lprix, x.lprix);
//		this.qed = true;
		this.ped = false;

		this.qc = m && !(m.qte === undefined) ? m.qte : this.qi;

		if (!this.reel || this.x.lprix.length == 0) {
			this.pi = this.convi.q2p(this.qi).res;
			this.mi = this.convi.q2e(this.qi).res;
		} else {
			this.lpqi = this.x.lprix.length;
			this.mi = 0;
			this.pi = 0;
			for(var i = 0; i < this.x.lprix.length; i++) {
				var mx = this.x.lprix[i];
				this.mi += mx;
				this.pi += this.conv.e2p(mx).res;
			}
		}
		
		this.lpc = this.lped ? m.lprix : (x && x.lprix ? x.lprix : []);
		if (this.lpc.length == 0) {
			this.pc = this.conv.q2p(this.qc).res;
			this.mc = this.conv.q2e(this.qc).res;
		} else {
			this.mc = 0;
			this.pc = 0;
			this.lpqc = this.lpc.length;
			for(var i = 0; i < this.lpc.length; i++) {
				var mx = this.lpc[i];
				this.mc += mx;
				this.pc += this.conv.e2p(mx).res;
			}
			this.srcLp = true;
		}
		
		break;
	}
	case 3 : {
//		this.qed = (m && !(m.qte === undefined) && m.poids === undefined) || (!m && x && x.poids_);
		this.ped = (m && !(m.poids === undefined)) || (!m && x && !AC.LivrC.aPoidsEstime(x));
//		this.ped = (m && !(m.poids === undefined)) || (!m && x && !x.poids_);
		var b = false;
		if (!this.reel) {
			this.qi = 0;
			this.pi = 0;
			this.mi = 0;
		} else {
			if (AC.LivrC.aPoidsEstime(x)) {
//			if (x.poids_) {
				this.pi = x.poids;
				this.mi = x.prix;
			} else { // poids réel saisi
				this.pi = x.poids;
				this.mi = x.prix;
				this.qi = this.convi.p2q(this.pi).res;
				b = true;
			}
		}
		this.pc = this.pi;
		this.qc = this.qi;
		this.mc = this.mi;
		if (m) {
			if (!(m.poids === undefined)){
				this.pc = m.poids;
				this.qc = this.conv.p2q(this.pc).res;
				this.mc = this.conv.p2e(this.pc).res;
				b = false;
			} else if (!(m.qte === undefined)){
				this.qc = m.qte;
				this.pc = this.conv.q2p(this.qc).res;
				this.mc = this.conv.q2e(this.qc).res;
				b = false;
			}
		}
		if (b){
			this.qc = this.conv.p2q(this.pi).res;
			this.mc = this.conv.p2e(this.pc).res;
		}
		break;
	}
	}
}
AC.edAcApPr._static = {}
AC.edAcApPr._proto = {
	className : "edAcApPr",
		
	lpq : function(){
		if (this.pd.type != 2)
			return "";
		return this.yel(this.lpqi != this.lpqc, this.lpqc);
	},
	
	qte : function(){
		return this.yel(this.qi != this.qc, this.bold(true, this.conv.edq(this.qc)));
	},

	qteL : function(initAC, space){
		var av = this.qi == this.qc ? "" : "<span class='barre'>&nbsp;" + 
				this.convi.edq(this.qi) + "&nbsp;</span>&nbsp;&nbsp;";
		var es = initAC && this.x && !(this.x.qteS === undefined) && this.qs != this.qc ?
				"<span class='italic orange small'><br>" + this.conv.edq(this.qs) + "&nbsp;" + initAC + "</span>" : "";
		if (space && !av && !es && !this.qc)
			return "&nbsp;";
		return this.yel(this.qi != this.qc, av + this.bold(true, this.conv.edq(this.qc)) + es);
	},
	
	qteS : function(){
		return this.conv.edq(this.qs);
	},

	poids : function(){
		return this.yel(this.pi != this.pc, this.bold(this.ped, this.conv.edp(this.pc)));
	},

	poidsL : function(space){
		var av = !this.ped || this.pi == this.pc ? "" : "<span class='barre'>&nbsp;" + 
				this.convi.edp(this.pi) + "&nbsp;</span>&nbsp;&nbsp;";
		var calc = "";
		if (!this.ped && !this.srcLp && this.qc)
			calc = "<span class='small italic'>(" + this.conv.edq(this.qc) + "&nbsp;x&nbsp;" 
				+ this.conv.edp(this.prefc) + ")</span>";
		if (space && !av && !calc && !this.pc)
			return "&nbsp;";
		return this.yel(this.pi != this.pc, av + this.bold(this.ped, this.conv.edp(this.pc)) + calc);
	},
	
	prix : function(){
		return this.yel(this.qi != this.qc, this.conv.ede(this.mc));
	},
	
	prixL : function(space){
		var calc = "";
		if (!this.ped && !this.srcLp && this.qc)
			calc = "<span class='small italic'> (" + this.conv.edq(this.qc) + "&nbsp;x&nbsp;" 
			+ this.conv.edp(this.prefc) + "&nbsp;x&nbsp;" + this.conv.ede(this.conv.pu) + ")</span>";
		if (space && !calc && !this.mc)
			return "&nbsp;";
		return this.yel(this.mi != this.mc, this.bold(this.ped, this.conv.ede(this.mc) + calc));
	},
	
	bold : function(b, val){
		return b ? "<span class='bold'>" + val + "</span>" : val;
	},
	
	yel : function(ch, val){
		if (ch)
			return "<div class='acModifieN'>" + val + "</div>";
		else
			return "<span>" + val + "</span>";
	}
	
}
AC.declare(AC.edAcApPr);

/****************************************************************/
AC.edApPr = function(x, m, pd, cv, style, reduc){
	this.sty = style ? "<span class='" + style + "'>" : "<span class='bold'>";
	this.x = x;
	this.m = m;
	this.pd = pd;
	this.cv = cv;
	this.reel = x && x.status == 2;
	this.parDemi = this.pd.type == 3 && this.pd.parDemi;
	var r = reduc === undefined ? (this.x && this.x.cell ? this.x.cell.reduc : 0) : reduc ;
	this.conv = new AC.Conv(this.pd, this.cv, r);
	this.nouveau = (!x || x.status != 2) && m;
	if (pd.type == 2){
		this.lpqid = 0;
		this.lppid = 0;
		this.lpmid = 0;
		this.lpqic = 0;
		this.lppic = 0;
		this.lpmic = 0;
		this.lpqcd = 0;
		this.lppcd = 0;
		this.lpmcd = 0;
		this.lpqcc = 0;
		this.lppcc = 0;
		this.lpmcc = 0;
	}
	if (this.reel){
		this.qi = x.qte;
		this.pi = x.poids;
		this.mi = x.prix;
		if (pd.type == 2){
			this.lpqid = x.lprix.length;
			for(var i = 0; i < this.lpqid; i++){
				var mx = Math.round(x.lprix[i] / 1000);
				this.lpmid += mx;
				this.lppid += this.conv.e2p(mx).res;
			}
			this.lpqic = x.lprixC.length;
			for(var i = 0; i < this.lpqic; i++){
				var mx = Math.round(x.lprixC[i] / 1000);
				this.lpmic += mx;
				this.lppic += this.conv.e2p(mx).res;
			}
		}
	} else {
		this.qi = 0;
		this.pi = 0;
		this.mi = 0;
	}
	
	this.qc = m && !(m.qte === undefined) ? m.qte : this.qi;
	this.pc = m && !(m.poids === undefined) ? m.poids : this.pi;
	this.mc = m && !(m.prix === undefined) ? m.prix : this.mi;
	
	if (pd.type == 2 && m && !(m.lprix === undefined)){
		this.lpqcd = m.lprix.length;
		for(var i = 0; i < this.lpqcd; i++){
			var mx = Math.round(m.lprix[i] / 1000);
			this.lpmcd += mx;
			this.lppcd += this.conv.e2p(mx).res;
		}
	} else {
		this.lpqcd = this.lpqid;
		this.lpmcd = this.lpmid;
		this.lppcd = this.lppid;
	}

	if (pd.type == 2 && m && !(m.lprixC === undefined)){
		this.lpqcc = m.lprixC.length;
		for(var i = 0; i < this.lpqcc; i++){
			var mx = Math.round(m.lprixC[i] / 1000);
			this.lpmcc += mx;
			this.lppcc += this.conv.e2p(mx).res;
		}
	} else {
		this.lpqcc = this.lpqic;
		this.lpmcc = this.lpmic;
		this.lppcc = this.lppic;
	}
}
AC.edApPr._static = {}
AC.edApPr._proto = {
	className : "edAcApPr",
	
	hasLpc : function(){
		return this.lpqcc;
	},

	hasLpd : function(){
		return this.lpqcd;
	},
 
	lpqc : function(){
		if (this.pd.type != 2)
			return "";
		return this.yel(this.lpqic == this.lpqcc, this.lpqcc);
	},

	lpqd : function(){
		if (this.pd.type != 2)
			return "";
		return this.yel(this.lpqid == this.lpqcd, this.lpqcd);
	},

	lppc : function(){
		if (this.pd.type != 2)
			return "";
		return this.yel(this.lppcc == this.lppic, INT.editKg(this.lppcc));
	},

	lppd : function(){
		if (this.pd.type != 2)
			return "";
		return this.yel(this.lppcd == this.lppid, INT.editKg(this.lppcd));
	},

	lpmc : function(){
		if (this.pd.type != 2)
			return "";
		return this.yel(this.lpmic == this.lpmcc, INT.editE(this.lpmcc));
	},

	lpmd : function(){
		if (this.pd.type != 2)
			return "";
		return this.yel(this.lpmid == this.lpmcd, INT.editE(this.lpmcd));
	},

	yel : function(b, x) {
		if (!b)
			return "<div class='acModifie'>" + x + "</div>";
		else
			return this.sty + x + "</span>";
	},

	qte : function(){
		return this.yel(this.qi == this.qc, this.conv.edq(this.qc));
	},
	
	poids : function(nobold){
		return this.yel(this.pi == this.pc, this.conv.edp(this.pc));
	},

	prix : function(){
		return this.yel(this.mi == this.mc, this.conv.ede(this.mc));
	},

	qteC : function(empty){
		if (this.m && (!(this.m.qteC === undefined) || this.m.razC)) {
			var zz = this.m.qteC >= 0 ? this.conv.edq(this.m.qteC) : "inc.";
			return "<div class='acModifie'>" + zz + "</div>";
		}
		if (this.reel && this.x.charge) 
			return this.sty + this.conv.edq(this.x.qteC) + "</span>";
		return empty ? "" : "&nbsp;";
	},

	qteCX : function(){
		var sty = "<span class='" + (this.x.charge ? "bold" : "italic") + "'>";
		return sty + this.conv.edq(this.x.qteCX) + "</span>";
	},

	poidsC : function(empty){
		if (this.m && !(this.m.poidsC === undefined)) {
			var zz = this.m.poidsC >= 0 ?  this.conv.edp(this.m.poidsC) : "inc.";
			return "<div class='acModifie'>" + zz + "</div>";
		}
		if (this.reel && this.x.charge)
			return this.sty + this.conv.edp(this.x.poidsC) + "</span>";
		return empty ? "" : "&nbsp;";
	},

	poidsCX : function(){
		var sty = "<span class='" + (this.x.charge ? "bold" : "italic") + "'>";
		return sty + this.conv.edp(this.x.poidsCX) + "</span>";
	},

	prixDeC : function(p) {
		if (this.pd.type == 1) {
			if (this.m && !(this.m.qteC === undefined))
				return this.conv.q2e(this.m.qteC).ed();
			else {
				if (this.reel && this.x.decharge)
					return this.conv.q2e(this.x.qteC).ed();
				else
					return "&nbsp;";
			}
		} else
			return this.conv.p2e(p).ed();
	},

	prixC : function(){
		if (this.m && !(this.m.poidsC === undefined))
			return "<div class='acModifie'>" + this.prixDeC(this.m.poidsC) + "</div>";
		if (this.reel && this.x.charge)
			return this.sty + this.prixDeC(this.x.poidsC) + "</span>";
		return "&nbsp;";
	},
	
	prixCX : function(){
		var sty = "<span class='" + (this.x.charge ? "bold" : "italic") + "'>";
		return sty + this.conv.ede(this.x.prixCX) + "</span>";
	},

	qteD : function(empty){
		if (this.m && (!(this.m.qteD === undefined) || this.m.razD)) {
			var zz = this.m.qteD >= 0 ? this.conv.edq(this.m.qteD) : "inc.";
			return "<div class='acModifie'>" + zz + "</div>";
		}
		if (this.reel && this.x.decharge)
			return this.sty + this.conv.edq(this.x.qteD) + "</span>";
		return empty ? "" : "&nbsp;";
	},

	qteDX : function(){
		var sty = "<span class='" + (this.x.decharge ? "bold" : "italic") + "'>";
		return sty + this.conv.edq(this.x.qteDX) + "</span>";
	},

	poidsD : function(empty){
		if (this.m && !(this.m.poidsD === undefined)) {
			var zz = this.m.poidsD >= 0 ? this.conv.edp(this.m.poidsD) : "inc.";
			return "<div class='acModifie'>" + zz + "</div>";
		}
		if (this.reel && this.x.decharge)
			return this.sty + this.conv.edp(this.x.poidsD) + "</span>";
		return empty ? "" : "&nbsp;";
	},

	poidsDX : function(){
		var sty = "<span class='" + (this.x.decharge ? "bold" : "italic") + "'>";
		return sty + this.conv.edp(this.x.poidsDX) + "</span>";
	},

	prixDeD : function(p) {
		if (this.pd.type == 1) {
			if (this.m && !(this.m.qteD === undefined))
				return this.conv.q2e(this.m.qteD).ed();
			else {
				if (this.reel && this.x.decharge)
					return this.conv.q2e(this.x.qteD).ed();
				else
					return "&nbsp;";
			}
		} else
			return this.conv.p2e(p).ed();
	},
	
	prixD : function(){
		if (this.m && !(this.m.poidsD === undefined))
			return "<div class='acModifie'>" + this.prixDeD(this.m.poidsD) + "</div>";
		if (this.reel && this.x.decharge)
			return this.sty + this.prixDeD(this.x.poidsD) + "</span>";
		return "&nbsp;";
	},
	
	prixDX : function(){
		var sty = "<span class='" + (this.x.decharge ? "bold" : "italic") + "'>";
		return sty + this.conv.ede(this.x.prixDX) + "</span>";
	}

}
AC.declare(AC.edApPr);

/****************************************************************/
AC.FicheSet = function(owner, model, _cont){
	this.owner = owner;
	this.pbody = this.owner["paintBody" + model];
	this.rbody = this.owner["registerBody" + model];
	this.ptitle = this.owner["paintTitle" + model];
	this.rtitle = this.owner["registerTitle" + model];
	this.onHide = this.owner["onHide" + model];
	this._cont = _cont;
	this.lstFiches = [];
	this.fiches = {};
	this.ficheVisible = null;
}
AC.FicheSet._proto = {
	className : "FicheSet",
	
	hide : function() {
		if (this.ficheVisible) {
			var fi = this.fiches[this.ficheVisible];
			this.ficheVisible = null;
			if (fi) {
				fi._title.removeClass("fiOuverte");
				fi._body.html("");
			}
			if (this.onHide)
				this.onHide.call(this.owner);
		}
	},
	
	showHide : function(id){
		if (this.ficheVisible) {
			var justHideIt = this.ficheVisible == id;
			this.hide();
			if (!justHideIt)
				this.show(id);
		} else
			this.show(id);
	},

	show : function(id){
		this.ficheVisible = id;
		var fi = this.fiches[this.ficheVisible];
		var t = this.pbody.call(this.owner, fi);
		fi._body.html(t);
		var h = fi._body.height();
		fi._title.addClass("fiOuverte");
		if (this.rbody)
			this.rbody.call(this.owner, fi, fi._body);
	},
	
	repaint : function(fiches){
		var lstFiches = [];
		for(var f in fiches)
			lstFiches.push(f);
		lstFiches.sort(function(a,b){
			var xa = fiches[a].tri;
			var xb = fiches[b].tri;
			if (xa < xb) return -1;
			if (xa > xb) return 1;
			return 0;
		});
		var b = lstFiches.length == this.lstFiches.length;
		if (b) {
			for(var i = 0; i < lstFiches.length; i++)
				if (lstFiches[i] != this.lstFiches[i]){
					b = false;
					break;
				}
		}
		if (!b){
			this.lstFiches = lstFiches;
			this.fiches = fiches;
			var sb = new StringBuffer();
			var colorp = null;
			for(var i = 0, id = null; id = this.lstFiches[i]; i++){
				var fi = this.fiches[id];
				sb.append("<div class='fiche' data-index='" + id + "'>");
				var c = fi.color ? fi.color : "";
				sb.append("<div class='fTitle " + c + "'>");
				colorp = c;
				sb.append(this.ptitle.call(this.owner, fi));
				sb.append("</div><div class='fBody'>")
				if (this.ficheVisible == id)
					sb.append(this.pbody.call(this.owner, fi));
				sb.append("</div></div>");
			}
			
			this._cont.html(sb.toString());
			
			var self = this;
			this._cont.find(".fiche").each(function(){
				var _f = $(this);
				var id = _f.attr("data-index");
				var fi = self.fiches[id];
				fi._cont = _f;
				fi._title = _f.find(".fTitle");
				fi._body = _f.find(".fBody");
				if (self.rtitle)
					self.rtitle.call(self.owner, fi, fi._title);
				if (self.ficheVisible == id && self.rbody)
					self.rbody.call(this.owner, fi, fi._body);
				if (self.ficheVisible == id)
					fi._title.addClass("fiOuverte");
				else
					fi._title.removeClass("fiOuverte");
			});
						
		} else {
			for(var i = 0, id = null; id = lstFiches[i]; i++){
				var fix = fiches[id];
				var fi = this.fiches[id];
				fi.color = fix.color;
				fix.tri = fix.tri;
				fi.x = fix.x;
				if (this.ptitle)
					fi._title.html(this.ptitle.call(this.owner, fi));
				if (this.rtitle)
					this.rtitle.call(this.owner, fi, fi._title);
				if (this.ficheVisible == id) {
					fi._title.addClass("fiOuverte");
					fi._body.html(this.pbody.call(this.owner, fi));
					if (this.rbody)
						this.rbody.call(this.owner, fi, fi._body);
				} else
					fi._title.removeClass("fiOuverte");
			}
		}
	}
	
}
AC.declare(AC.FicheSet);

/****************************************************************/
AC.LV = function(){}
AC.LV._static = {
	lvGAC : function(t, slivr, elt){
		var id = slivr.gap + "_" + slivr.codeLivr + "_" + slivr.gac;
		t.append("<div class='action2' data-index='" + id 
				+ "'><b>Dates et heures </b></div>");
		
		t.append("<div class='acsIL large'><b>" + Util.editEltH(elt) + "</b></div>");
		
		t.append("<img class='acsStatut' src='images/st" + slivr.statut + ".png'></img>");
		if (slivr.suppr || slivr.livr.suppr)
			t.append("<div class='acsIL red'> - ANNULEE - </div>");
		
		if (slivr.statut == 2){
			t.append("<div class='acsIL'>Limite " + AC.AMJ.dateTCourte(slivr.livr.limite));
			if (slivr.livr.hlimite) {
				var hx = slivr.livr.hlimite;
				var hy = hx > slivr.hlimac ? hx - slivr.hlimac : 1;
				if (APP.Ctx.authUsr && slivr.hlimac)
					t.append(" à " + hy + "h"); 
				else {
					t.append(" à " + hx + "h");
					if (hx != hy)
						t.append(" (" + hy + "h pour les AC)");
				}	
			}
			t.append("; </div>");
		}
		var jjd = AC.AMJ.dateTCourte(slivr.distrib);
		var jjl = AC.AMJ.dateTCourte(slivr.dlivr);
		if (APP.Ctx.authUsr) {
			t.append("<div class='acsIL'>Distribution " + jjd);
			if (slivr.hdistrib) { 
				if (!slivr.fdistrib)
					t.append(" à partir de " + slivr.hdistrib + "h</div>");
				else
					t.append(" de " + slivr.hdistrib + "h à " + slivr.fdistrib + "h</div>");
			} else
				t.append("</div>");
		} else {
			t.append("<div class='acsIL'>Livraison " + jjl);
			if (slivr.hlivr)
				t.append(" à  " + slivr.hlivr + "h; </div>");
			else
				t.append("; </div>");
			t.append("<div class='acsIL'>Distribution " + jjd);
			if (slivr.hdistrib) { 
				if (!slivr.fdistrib)
					t.append(" à partir de " + slivr.hdistrib + "h</div>");
				else
					t.append(" de " + slivr.hdistrib + "h à " + slivr.fdistrib + "h</div>");
			} else
				t.append("</div>");
		}
	},

	lvGAP : function(t, livr, slivr, elt){
		var id = livr.gap + "_" + livr.codeLivr + (!slivr ? "" : "_" + slivr.gac);
		if (!slivr)
			t.append("<div class='action2' data-index='" + id 
				+ "'><b>Dates et heures </b></div>");
		var statut = slivr ? slivr.statut : livr.statut;
		t.append("<div class='acsIL large'><b>" + Util.editEltH(elt) + "</b></div>");
		t.append("<img class='acsStatut' src='images/st" + statut + ".png'></img>");
		if (!slivr){
			if (livr.suppr)
				t.append("<div class='acsIL red'> - ANNULEE - </div>");
			t.append("<div class='acsIL'>Expédition : " + AC.AMJ.dateTCourte(livr.expedition) + "</div>");
			t.append("<div class='acsIL'>Limite " + AC.AMJ.dateTCourte(livr.limite));
			if (livr.hlimite)
				t.append(" " + livr.hlimite + "h");
			t.append("</div>");
		} else {
			if (livr.suppr || slivr.suppr)
				t.append("<div class='acsIL red'> - ANNULEE - </div>");
			t.append("<div class='acsIL'>Livraison " + AC.AMJ.dateTCourte(slivr.dlivr));
			if (slivr.hlivr)
				t.append(" à  " + slivr.hlivr + "h");
			t.append("</div>");
		}
	},

	slv1 : function(t, slivr, option, ad){
		var elt = AC.GAP.elt(slivr.gap);
		t.append("<div class='v2Rowh'>");
		t.append("<div class='v2Text'>");
		this.lvGAC(t, slivr, elt);
		if (option && option.indexOf("-p") != -1 && !APP.Ctx.authUsr) {
			t.append("<div class='acsILB2'>");
			t.append("<div class='action bdlbtn' style='font-size:1.1rem !important'>Bon de Livraison</div>");
			t.append("<div class='action bddbtn' style='font-size:1.1rem !important'>Bon de Distribution</div>");
			t.append("<div class='action etcbtn' style='font-size:1.1rem !important'>Etc.</div></div>");
			if (ad)
				t.append(ad);
		}
		t.append("</div>");
		if (APP.Ctx.authUsr)
			var x = APP.Ctx.livrG.getAc(true, slivr.codeLivr, slivr.gap, APP.Ctx.authUsr);
		else
			var x = APP.Ctx.livrG.getGac(true, slivr.codeLivr, slivr.gap);
		new AC.Cpt().init(t, x, option, slivr.phase > 2 ? AC.DTGac.maskFlagD : AC.DTGac.maskFlagC);
		t.append("<div class='acEnd'></div></div>");
	},

	slv2 : function(t, slivr, x, option){
		var elt = AC.GAC.elt(slivr.gac);
		var livr = slivr.livr;
		t.append("<div class='v2Rowh'>");
		t.append("<div class='v2Text'>");
		this.lvGAP(t, slivr.livr, slivr, elt);
		t.append("</div>");
		if (APP.Ctx.authUsr)
			new AC.Cpt().init(t, x, option, slivr.phase > 2 ? AC.DTGac.maskFlagD : AC.DTGac.maskFlagC);
		else
			new AC.Cpt().init(t, x, option, slivr.phase > 2 ? AC.DTGac.maskFlagD : AC.DTGac.maskFlagC);
		t.append("<div class='acEnd'></div></div>");
	},

	lv : function(t, livr){
		var elt = AC.GAP.elt(livr.gap);
		t.append("<div class='v2Row" + APP.altc(elt.color) + "'>");
		t.append("<div class='v2Text'>");
		this.lvGAP(t, livr, null, elt);
		t.append("</div>");
		if (APP.Ctx.authUsr) {
			var x = APP.Ctx.livrP.getSGAp(true, livr.codeLivr, APP.Ctx.authUsr);
			new AC.Cpt().init(t, x, "-tt", livr.phase > 2 ? AC.DTGac.maskFlagD : AC.DTGac.maskFlagC);
		} else {
			var x = APP.Ctx.livrP.getSG(true, livr.codeLivr);
			new AC.Cpt().init(t, x, "-tt", livr.phase > 2 ? AC.DTGac.maskFlagD : AC.DTGac.maskFlagC);
		}
		t.append("<div class='acEnd'></div></div>");
	},

	html : "<div class='btnBox' id='btnBoxLV'></div>"
		+ "<div id='barLV' class='bar'>"
		+ "<div class='acsBtnTI' id='hlpDates'><img class='acsBtnTImg' src='images/info.png'/></div>"
		+ "<div class='titre'>Liste des livraisons </div>"
		+ "<div class='btnL'><div class='btn' data-index='1'>En cours</div>"
		+ "<div class='btnT'>celles de la semaine et ouvertes aux commandes des semaines suivantes</div>"
		+ "</div><div class='btnL'><div class='btn' data-index='5'>Récentes</div>"
		+ "<div class='btnT'>celles des semaines précédentes non archivées (finalisation comptable)</div>"
		+ "</div><div class='btnL'><div class='btn' data-index='2'>Planifiées</div>"
		+ "<div class='btnT'>celles futures non encore ouvertes aux commandes</div>"
		+ "</div><div class='btnL'><div class='btn' data-index='3'>Archivées</div>"
		+ "<div class='btnT'>celles passées non modifiables et consultables à titre d'historique</div>"
		+ "</div><div class='btnL'><div class='btn' data-index='4'>Calendrier</div>" 
		+ "<div class='btnT'>tous les jours passés et futurs ayant une livraison</div></div>"
		+ "</div>"
		+ "<div class='infoBox' id='infoLV'></div>"
		+ "<div id='dates'></div>"

		+ "<div id='barDT' class='bar'>"
		+ "<div class='acsBtnTI' id='hlpDetail'><img class='acsBtnTImg' src='images/info.png'/></div>"
		+ "<div class='titre' id='titreDT'></div>"
		+ "</div>"
		+ "<div id='news'></div>"
		+ "<div id='detail'>"
		+ "<div class='btnBox' id='btnBoxDT'></div>"
		+ "<div id='contentDT'></div></div>",

}
AC.LV._proto = {	
	className : "LV",
	
	init : function(){
		AC.ac2.viewLV = this;
		APP._bottom.html(AC.LV.html);
		
		AC.oncl(this, 'hlpDates', function(target){
			AC.Help.gotoHelp(AC.ac2.viewLV.className);
		});
		AC.oncl(this, 'hlpDetail', function(target){
			AC.Help.gotoHelp(AC.ac2.viewDT.className);
		});
								
		this._btnBox = APP._bottom.find("#btnBoxLV");
		this._bar = APP._bottom.find("#barLV");
		this._info = APP._bottom.find("#infoLV");
		AC.ac2._barDT = APP._bottom.find("#barDT");
		AC.ac2._titreDT = APP._bottom.find("#titreDT");
		AC.ac2._news = APP._bottom.find("#news");
		AC.ac2._dates = APP._bottom.find("#dates");
		AC.ac2._detail = APP._bottom.find("#detail");
		AC.ac2._contentDT = APP._bottom.find("#contentDT");
		AC.ac2._btnBoxDT = APP._bottom.find("#btnBoxDT");
		AC.ac2._barDT.css("display", "none");
		AC.ac2._detail.css("display", "none");
		AC.ac2._news.css("display", "none");

		AC.oncl(this, this._bar.find(".btn"), function(target){
			this.onBtn(parseInt(target.attr("data-index"), 10));
		});

		var sb = new StringBuffer();
		sb.append("<div id='synthese' class='action'>Voir Synthèse hebdo</div>");
		if (!APP.Ctx.authUsr) {
			sb.append("<div id='mails' class='action'>Envoi de mails</div>");
			sb.append("<div id='stats' class='action'>Export statistiques en Excel</div>");
		}
		this._btnBox.html(sb.toString());
		AC.oncl(this, this._btnBox.find(".action"), function(target){
			var a = "action_" + target.attr("id");
			if (this[a])
				this[a]();
		});

		this.watch(APP.Ctx.dir);
		this.watch(APP.Ctx.cal);
		this.cellGrp = APP.Ctx.loginGrp;
		this.watch(this.cellGrp);

		this.btn = this.constructor.btn ? this.constructor.btn : 1;
	},
	
	action_stats : function(){
		var cg = APP.Ctx.authType == 1 ? APP.Ctx.loginGac : APP.Ctx.loginGap;
		new AC.ExportStatsXLS(cg.enumElt().initiales);
	},
	
	action_synthese : function(){
		AC.Req.submitForm(50, "alterconsos/export");
	},

	action_mails : function(){
		new AC.FormMail2().init();
	},
	
	resetBtn : function(){
		this._bar.find(".btn").removeClass("sel");
		this._bar.find(".btn").removeClass("actif");
		var b = this._bar.find("[data-index='" + this.btn + "']");
		b.addClass("sel");
		b.addClass("actif");
		var m = "Cliquer sur la flèche devant la journée à détailler ou le jour dans le calendrier";
		if (APP.Ctx.authType == 2 && !APP.Ctx.authUsr)
			m += "<br>La déclaration d'une nouvelle livraison se fait depuis \"Calendrier\"."
		this._info.html(m);
	},
	
	onBtn : function(btn){
		if (AC.ac2.viewDT)
			AC.ac2.viewDT.close();
		this.btn = btn;
		this.resetBtn();
		AC.ac2._dates.css("display", "block");
		this.start();
	},
		
	display : function(){
		if (this.btn != 4) {
			var sb = new StringBuffer();
			sb.append("<div id='masque'></div>");
			if (APP.Ctx.authType == 2)
				sb.append("<div id='masque2'></div>");
			sb.append("<div class='acSpace1'></div>");
			AC.AMJ.getTime();
			var dx = this.lstLivrs.dates;
			// var lu = Util.mondayOfaammjj(AC.AMJ.aujourdhui);
			var lu = AC.AMJ.aujourdhui;
			if (this.btn == 3 || this.btn == 5)
				for(var i = dx.length - 1, d = 0; d = dx[i]; i--)
					this.editLv(sb, d, lu);
			else
				for(var i = 0, d = 0; d = dx[i]; i++)
					this.editLv(sb, d, lu);
			AC.ac2._dates.html(sb.toString());
			this.registerClock(AC.ac2._dates);
			AC.Cpt.register(AC.ac2._dates);
			
			var masque = new AC.CheckBox2(AC.ac2._dates.find("#masque"), null, "Voir AUSSI les livraisons annulées");
			masque.val(this.constructor.masque ? true : false);
			var self = this;
			masque.jqCont.off("dataentry").on("dataentry", function(){
				self.constructor.masque = masque.val();
				self.display();
			});

			if (APP.Ctx.authType == 2){
				var masque2 = new AC.CheckBox2(AC.ac2._dates.find("#masque2"), null, "Voir AUSSI les groupes d'alterconsos n'ayant pas commandé");
				masque2.val(this.constructor.masque2 ? true : false);
				var self = this;
				masque2.jqCont.off("dataentry").on("dataentry", function(){
					self.constructor.masque2 = masque2.val();
					self.display();
				});
			}

			AC.oncl(this, AC.ac2._dates.find(".selectable"), function(target){
				this.selectJour(parseInt(target.attr("data-index"), 10));
			});
		} else
			new AC.CAL().init(this);
	},
		
	selectJour : function(aammjj){
		this.showLivr(aammjj);
	},

	nouvelle : function(aammjj){
		AC.AMJ.getTime();
		if (aammjj < AC.AMJ.aujourdhui){
			AC.Message.error("Création de livraison dans le passé non autorisée");
			return;
		}
		new AC.NVLivraison(aammjj);
	},
		
	quit : function(){
		AC.ac2._dates.html("");
		AC.ac2._dates.css("display", "none");
		this._info.html("Cliquer sur un des boutons ci-dessus pour réafficher la liste des livraisons");
		this._bar.find(".btn").removeClass("actif");
		this.pause();
	},
	
	registerClock : function(_cont){
		AC.oncl(this, _cont.find(".action2"), function(target){
			var id = target.attr("data-index");
			var ids = id.split("_");
			var gap = parseInt(ids[0], 10);
			var codeLivr = parseInt(ids[1], 10);
			var gac = ids.length == 2 ? 0 : parseInt(ids[2], 10);
			new AC.Livraison2(gap, codeLivr, gac);
		});
	},
	
	close : function(){
		this.stop();
		if (AC.ac2.viewDT)
			AC.ac2.viewDT.close();
		AC.ac2.viewLV = null;
	}
}
AC.declare(AC.LV, null, AC.AutoSync);

/****************************************************************/
AC.LV1 = function(){}
AC.LV1._static = {
	masque : true,
}
AC.LV1._proto = {
	className : "LV1",

	init : function(){
		AC.LV.prototype.init.call(this);
		this.watch(APP.Ctx.livrG);
		if (!APP.Ctx.authDate) {
			this.onBtn(this.btn);
			return this;
		}
		var dlu = Util.mondayOfaammjj(APP.Ctx.authDate);
		var slivrs = APP.Ctx.cal.getLivrsGAC(APP.Ctx.authGrp, dlu);
		for(var i = 0, sl = null; sl = slivrs[i]; i++){
			if (sl.distrib == APP.Ctx.authDate) {
				this.showLivr(APP.Ctx.authDate);
				return this;
			}
		}
		this.onBtn(this.btn);
		return this;
	},
	
	compile : function(){
		// {dates : [], livr : {d1:[], d2}}
		this.lstLivrs = APP.Ctx.cal.getLivrsGAC2(APP.Ctx.authGrp);
	},

	editLv : function(t, d, lu){
		var btn = this.btn; // btn : 1 : en cours, 2: planifié, 3: archivé, 5 : récentes
		var b = false;
		var lst = [];
		var lvs = this.lstLivrs.livr[d];
		if (lvs != null) {
			var ok = false;
			for(var j = 0, livr = null; livr = lvs[j]; j++) {				
				var x = {initiales: AC.GAP.elt(livr.gap).initiales,	slivr: livr.slivrs[APP.Ctx.loginGrp.code]};
				if ((btn == 1 && x.slivr.statut <= 6 && x.slivr.statut >= 2 && livr.expedition >= lu)
					|| (btn == 5 && x.slivr.statut <= 6 && x.slivr.statut >= 2 && livr.expedition < lu)
					|| (btn == 2 && x.slivr.statut <= 1)
					|| (btn == 3 && x.slivr.statut > 6))
					ok = true;
				lst.push(x);
			}
		}
		if (ok) {
			lst.sort(AC.Sort.i);
			var vide = true;
			var phase = 0;
			for(var k = 0, lv = null; lv = lst[k]; k++) {
				var ph = lv.slivr.phase;
				if (ph > phase)
					phase = ph;
				if (!this.constructor.masque && (lv.slivr.suppr || lv.slivr.livr.suppr))
					continue;
				if (vide) {
					t.append("<div class='selectable' data-index='" + d + "'>");
					var dl = AC.AMJ.dateLongue(d);
					t.append("<div class='dateJSBK'><div class='dateJS'>" + dl + "</div></div>");
					vide = false;
					APP.colorPaire = false;
				}
				AC.LV.slv1(t, lv.slivr, "-tt");
			}
			if (!vide)
				t.append("</div>");
			this.resyncIfNeeded();
		}
	},
	
	showLivr : function(dlu){
		this.quit();
		if (APP.Ctx.authUsr)
			new AC.DTAc().init(dlu);
		else
			new AC.DTGac().init(dlu);		
	}

}
AC.declare(AC.LV1, AC.LV);

/****************************************************************/
AC.LV2 = function(){}
AC.LV2._static = {
	masque : true,
	masque2 : true
}
AC.LV2._proto = {
	className : "LV2",

	init : function(){
		AC.ac2.monoAP = APP.Ctx.authUsr || APP.Ctx.loginGrp.estMono();
		AC.LV.prototype.init.call(this);
		this.watch(APP.Ctx.livrP);
		if (!APP.Ctx.authDate)
			this.onBtn(this.btn);
		else {
			var dlu = Util.mondayOfaammjj(APP.Ctx.authDate);
			var livrs = APP.Ctx.cal.getLivrsGAP(APP.Ctx.authGrp, dlu);
			if (livrs.dates.length == 0)
				this.onBtn(this.btn);
			else {
				this.quit();
				var codeLivr = livrs.livr[livrs.dates[0]][0].codeLivr;
				new AC.DT2().init(codeLivr);
			}
		}
		return this;
	},

	compile : function(){
		// {dates : [], livr : {d1:[], d2}}
		this.lstLivrs = APP.Ctx.cal.getLivrsGAP(APP.Ctx.authGrp);
	},

	editLv : function(t, d, lu){
		var btn = this.btn; // btn : 1 : en cours, 2: planifié, 3: archivé 5: récentes
		var livr = this.lstLivrs.livr[d][0];
		if (livr.suppr && !this.constructor.masque)
			return;
		var b = (btn == 1 && livr.statut <= 6 && livr.statut >= 2 && livr.expedition >= lu)
				|| (btn == 5 && livr.statut <= 6 && livr.statut >= 2 && livr.expedition < lu)
				|| (btn == 2 && livr.statut <= 1)
				|| (btn == 3 && livr.statut > 6);

		if (!b)
			return;
		var phase = livr.phase;
		APP.colorPaire = false;
		var lst = [];
		for (var gac in livr.slivrs) {
			var slivr = livr.slivrs[gac];
			if (slivr.suppr && !this.constructor.masque)
				continue;
			if (APP.Ctx.authUsr)
				var x = APP.Ctx.livrP.getAp(true, slivr.codeLivr, slivr.gac, APP.Ctx.authUsr);
			else
				var x =  APP.Ctx.livrP.getGac(true, slivr.codeLivr, slivr.gac);
			if (x.status != 2 && !this.constructor.masque2)
				continue;
			var ph = slivr.phase;
			if (ph > phase)
				phase = ph;
			lst.push({slivr:slivr, initiales: AC.GAC.elt(gac).initiales, x:x});
		}
		lst.sort(AC.Sort.i);
		
		t.append("<div class='selectable' data-index='" + d + "'>");
		var dl = AC.AMJ.dateLongue(d);
		t.append("<div class='dateJSBK'><div class='dateJS'>" + dl + "</div></div>");
		AC.LV.lv(t, livr, phase);
		for(var j = 0, x = null; x = lst[j]; j++) {
			AC.LV.slv2(t, x.slivr, x.x, "-tt");
		}
		t.append("</div>");
	},

	showLivr : function(aammjj){
		this.quit();
		var codeLivr = this.lstLivrs.livr[aammjj][0].codeLivr;
		new AC.DT2().init(codeLivr);
	}

}
AC.declare(AC.LV2, AC.LV);

/************************************************************/
AC.CAL = function() {}
AC.CAL._static = {
    html2 : "<div class='acSpace05'>Pour déclarer une nouvelle expédition, "
		+ "cliquer sur le jour correspondant (blanc) dans le calendrier (après aujourd'hui)</div>",

	html3 : "<div id='masque'></div><div class='acCalSelGrp'>Repérer le ",
	
	html3b : " : <div class='acdd-box2' data-ac-id='selectgrp'></div></div>"
        + "<div class='bold italic acdc-aujourdhui' data-ac-id='aujourdhui'>"
        + "Descendre jusqu'à aujourd'hui</div>"
        + "<div id='calendrier'></div>"
	
}
AC.CAL._proto = {
	className : "Cal",

	init : function(origin){
		this.origin = origin;
		this.cellGrp = origin.cellGrp;
		this._content = AC.ac2._dates;
		
		var sb = new StringBuffer();
		if (APP.Ctx.currentMode == 1)
			sb.append(this.constructor.html2);
		sb.append(this.constructor.html3);
		sb.append(APP.Ctx.authType == 2 ? "groupe" : "groupement");
		sb.append(this.constructor.html3b);
		this._content.html(sb.toString());

		this._calendrier = this._content.find("#calendrier");
				
		var decor = APP.Ctx.dir.decor(this.cellGrp.isGAC ? 2 : 1, def, function(elt){
			return !elt.removed;
		}, true);
		this._selectgrp = new AC.Selector3(this, "selectgrp", decor, true);
		var def = "<div class='acdd-itemValue bold italic color16'>(aucun " + this.lg + ")</div>";
		this._selectgrp.val(this.constructor.grpRed ? this.constructor.grpRed : 0);
		var self = this;
		this._selectgrp.jqCont.off("dataentry").on("dataentry", function(event) {
			APP.NOPROPAG(event);
			var code = self._selectgrp.val();
			if (code != this.constructor.grpRed) {
				self.constructor.grpRed = code;
				self.constructor.eltRed = APP.Ctx.dir.getElement(APP.Ctx.authType == 2 ? 1 : 2, code);
				self.update();
			}
		});

		var masque = new AC.CheckBox2(this._content.find("#masque"), null, 
			"Voir AUSSI les livraisons annulées");
		masque.val(this.constructor.masque ? true : false);
		var self = this;
		masque.jqCont.off("dataentry").on("dataentry", function(){
			self.constructor.masque = masque.val();
			self.update();
		});

		APP.oncl(this, 'aujourdhui', this.aujourdhui);

		var t = new StringBuffer();
		t.append("<div class='calgen'>");
		var pj = AC.AMJ.premierJour;
		var dj = AC.AMJ.dernierJour;
		this.pa = Math.floor(pj / 10000);
		this.pm = Math.floor(pj / 100) % 100;
		this.da = Math.floor(dj / 10000);
		this.dm = Math.floor(dj / 100) % 100;
		var aa = this.pa;
		var mm = this.pm
		while ((aa * 100 + mm) <= (this.da * 100 + this.dm)) {
			AC.AMJ.genMois(t, aa * 10000 + mm * 100 + 1);
			mm++;
			if (mm > 12) {
				aa++;
				mm = 1;
			}
		}
		t.append("</div>");
		this._calendrier.html(t.toString());
		
		APP.oncl(this, this._calendrier.find(".cal"), function(target) {
			var aammjj = parseInt(target.attr("data-aammjj"));
			var x = this.origin.lstLivrs.livr[aammjj];
			if (!x) {
				if (APP.Ctx.authType == 2 && !APP.Ctx.authUsr)
					this.origin.nouvelle(aammjj);
			} else
				this.origin.selectJour(aammjj);
		})

		this._aamm = this._calendrier.find("[data-aamm='" + Math.floor(AC.AMJ.aujourdhui / 100) + "']");
		this._aamm.addClass("calmc");
		this.update();
		return this;
	},
	
	update : function() {
		this.getJour(AC.AMJ.aujourdhui).addClass("caljAJ");
		this._content.find(".caljblack").css("background-color", "transparent");
		this._content.find(".caljblack").removeClass("caljblack");
		var lst = this.origin.lstLivrs;
		this.origin.a_Cal = lst.dates;
		for ( var j = 0, d = 0; d = lst.dates[j]; j++){
			var lvs = lst.livr[d];
			var red = false;
			var nbDel = 0;
			var nbOK = 0;
			if (APP.Ctx.authType == 2) {
				if (lvs[0].suppr)
					nbDel++;
				else
					nbOK++;
				if (this.constructor.grpRed) {
					for(var g in lvs[0].slivrs)
						if (g == this.constructor.grpRed)
							red = true;
				} else 
					red = false;
			} else {
				for(var i = 0, livr = null; livr = lvs[i]; i++) {
					var slivr = livr.slivrs[APP.Ctx.authGrp];
					if ((slivr && slivr.suppr) || livr.suppr)
						nbDel++;
					else
						nbOK++;
					if (livr.gap == this.constructor.grpRed)
						red = true;
				}
			}
			if (nbOK || (nbDel && this.constructor.masque)) {
				if (red)
					this.setRed(d, this.constructor.eltRed.color);
				else
					this.setBlack(d);
			}
		}
	},

	aujourdhui : function() {
		var x = this.getJour(AC.AMJ.aujourdhui).offset().top;
		scrollTo(0, x - 250);
	},

	getJour : function(aammjj) {
		return this._content.find("[data-aammjj='" + aammjj + "']");
	},

	setRed : function(aammjj, c) {
		var x = this.getJour(aammjj);
		var e = x.find(".calx");
		e.addClass("caljblack").css("background-color", "red");
	},

	setBlack : function(aammjj) {
		var x = this.getJour(aammjj);
		var e = x.find(".calx").addClass("caljblack").css("background-color", "black");
	}
	
}
AC.declare(AC.CAL);

/****************************************************************/
AC.DT = function(){}
AC.DT._static = {}
AC.DT._proto = {
	className : "DT",

	init : function(){
		AC.ac2.viewDT = this;
		var sb = new StringBuffer();
		var dl = AC.AMJ.dateLongue(this.date);
		sb.append(dl);
		if (APP.Ctx.currentMode == 1)
			sb.append("<div class='action2'><b>Dates et heures </b></div>");
		AC.ac2._titreDT.html(sb.toString());
		if (APP.Ctx.currentMode == 1) {
			APP.oncl(this, AC.ac2._titreDT.find(".action2"), function(target){
				new AC.Livraison2(this.gap, this.codeLivr, 0);
			});
		}
		AC.ac2._barDT.css("display", "block");
		AC.ac2._detail.css("display", "block");
		AC.ac2._news.css("display", "block");
		this.cellGrp = APP.Ctx.loginGrp;
		this.watch(this.cellGrp);		
		this.watch(APP.Ctx.dir);
		this.watch(APP.Ctx.cal);
				
		this.newsON = false;
		this.start();
		return this;
	},
	
	display : function() {
		this.repaintNews();
		this.repaint();		
	},

	repaintNews : function(){
		var sb = new StringBuffer();
		sb.append("<div class='newsBox'><div id='newsBtn' class='btnFR'>Nouvelles </div><div class='newsBoxT'>");
		AC.Tweets.edt(sb, this.twx);
		sb.append("</div><div class='acEnd'></div></div>")
		sb.append("<div class='acSpace05 newsDet' id='newsDet'></div>");
		AC.ac2._news.html(sb.toString());
		this.newsDetail();
	},
	
	newsDetail : function(){
		var d = AC.ac2._news.find("#newsDet");
		var b = AC.ac2._news.find("#newsBtn");
		var of = this.newsON ? "ouvert" : "ferme";
		if (this.newsON) {
			d.css("display", "block");
			
			var t = new StringBuffer();
			if (APP.Ctx.authType == 2) {
				var ct = this.cellTweets;
				ct.displayTw2(t, ct.getActualTweets());
			} else {
				for ( var gx in this.listLivr) {
					var lv = this.listLivr[gx];
					var ct = lv.cellTweets;
					ct.displayTw2(t, ct.getActualTweets(this.gac), this.gac);
				}
			}
			d.html(t.toString());
			
			APP.oncl(this, d.find(".acsLnkP"), function(target){
				var obj = AC.decodeParam(target);
				if (APP.Ctx.authType == 2)
					new AC.FormTweets2(this.cellTweets);
				else
					new AC.FormTweets2(this.listLivr[obj.gap].cellTweets, this.gac);
			});
			APP.oncl(this, d.find(".acsLnkM"), function(target){
				var obj = AC.decodeParam(target);
				var ct = APP.Ctx.authType == 2 ? this.cellTweets : this.listLivr[obj.gap].cellTweets;
				var arg = {op:"31"};
				arg.numero = obj.msg;
				arg.gap = obj.gap;
				arg.codeLivr = ct.livr;
				arg.operation = "Suppression d'un message";
				AC.Req.post(this, "alterconsos", arg, "Suppression du message faite", "Echec de la suppression du message");
			});

			b.removeClass("ferme");
			b.addClass("ouvert");
		} else {
			d.css("display", "none");
			d.html("");
			b.removeClass("ouvert");
			b.addClass("ferme");			
		}
		AC.oncl(this, b, function(){
			this.newsON = !this.newsON;
			this.newsDetail();
		});
	},
	
	close : function(){
		this.stop();
		AC.ac2._btnBoxDT.html("");
		AC.ac2._contentDT.html("");
		AC.ac2._news.css("display", "none");
		AC.ac2._detail.css("display", "none");
		AC.ac2._barDT.css("display", "none");
		AC.ac2.viewDT = null;
	}

}
AC.declare(AC.DT, null, AC.AutoSync);

/****************************************************************/
AC.DT1 = function(){}
AC.DT1._static = {
	lvPlusAc : function(lv, ac){
		var bdl = [];
		var flags = {}
		var cpts = {}
		for(var i = 0, y = null; y = lv.bdl[i]; i++){
			var y2 = {apPr:y.x, eltAp:y.eltAp, pd:y.pd, cv:y.cv, cpts:{}};
			var x = lv.cellLivrC.getAcApPr(true, ac, y.x.ap, y.pd.pr);
			if (x.status == 2){
				y2.acApPr = x;
				if (!y.x.dechargeL && x.qte) y2.cpts.cmdNdch = 1;
				if (y.x.dechargeL && x.qte) y2.cpts.cmdETdch = 1;
				
				for(var cc in y2.cpts){
					if (cpts[cc] == undefined)
						cpts[cc] = 1;
					else
						cpts[cc]++;
				}
				var lst = AC.Flag.listOf(x.flags);
				for(var k = 0, fl = 0; fl = lst[k]; k++){
					if (flags[fl] == undefined)
						flags[fl] = 1;
					else
						flags[fl]++;						
				}
			}
			bdl.push(y2);
		}
		return {bdl:bdl, cpts:cpts, flags:flags};
	}

}
AC.DT1._proto = {
	className : "DT1",

	init : function(aammjj){
		this.date = aammjj;
		var n1 = AC.AMJ.nbj(this.date);
		this.moisMoins2 = AC.AMJ.aammjj(n1 - 60);
		this.dlu = Util.mondayOfaammjj(this.date);
		this.gac = APP.Ctx.authGrp;
		this.ac = APP.Ctx.authUsr ? APP.Ctx.authUsr : 0;
		this.eltAc = !this.ac ? null : APP.Ctx.loginGac.getContact(this.ac);
		return AC.DT.prototype.init.call(this);
	},
	
	compile : function(){
		this.listLivr = {};
		var aj = AC.AMJ.nbj(AC.AMJ.aujourdhui);	
		var ajl = AC.AMJ.nbj(this.dlu);
		this.semainePassee = aj >= ajl + 7;
		this.presences = APP.Ctx.loginGrp.getPresence(this.dlu);
		this.nbPresences();
		this.slivrSem = APP.Ctx.cal.getLivrsGAC(this.gac, this.dlu);
		var xx = APP.Ctx.cal.getSlivrByGap2(this.gac, this.date);
		this.phaseMax = 0;
		this.gaps = [];
		var tgaps = [];
		APP.Ctx.curLivrs = {};
		this.loading = false;
		for (var gx in xx) {
			var g = parseInt(gx, 10);
			var eltG = AC.GAP.elt(g);
			this.listLivr[gx] = {};
			var lv = this.listLivr[gx];
			lv.slivr = xx[gx];
			lv.livr = lv.slivr.livr;
//			this.gaps.push(g);
			lv.slivr.statut = APP.Ctx.cal.getStatut(lv.slivr);
			lv.slivr.phase = AC.Context.phases[lv.slivr.statut];	
			lv.livr.phase = lv.slivr.phase;
			lv.phase = lv.slivr.phase;
			if (lv.phase > this.phaseMax)
				this.phaseMax = lv.phase;
			lv.cellGap = AC.GAP.getN(g);
			lv.cellGac = APP.Ctx.loginGrp;
			if (lv.cellGap.version == -1) 
				this.loading = true;
			this.watch(lv.cellGap);
			lv.cellCtlg = AC.Catalogue.getN(g);
//			APP.Ctx.curLivrs[g] = lv.livr.codeLivr;
			APP.Ctx.curLivrs[g] = lv.livr;
			var lstAps = lv.cellGap.existAt(lv.livr.expedition);
			lv.ctlg = lv.cellCtlg.getCtlgLivr(lv.livr.codeLivr, 0, this.gac, lstAps);
			if (lv.cellCtlg.version == -1) this.loading = true;
			this.watch(lv.cellCtlg);
			lv.cellTweets = AC.Tweets.getN(g, lv.livr.codeLivr);
			lv.tweets = lv.cellTweets.getActualTweets(this.gac);
			if (lv.cellTweets.version == -1) this.loading = true;
			this.watch(lv.cellTweets);
			lv.cellLivrC = AC.LivrC.getN(g, lv.livr.codeLivr, this.gac);
			if (lv.cellLivrC.version <= 0) this.loading = true;
			var isExcl = !this.eltAc ? false : (this.eltAc.grExcl.indexOf(g) != -1);
			if (isExcl && lv.cellLivrC.version > 0) {
				var xAc = lv.cellLivrC.getAc(true, this.ac);
				if (xAc.status == 2)
					isExcl = false;
			}
			if (!isExcl)
				tgaps.push({code:g, initiales:APP.Ctx.dir.getElement(2,g).initiales});
			this.watch(lv.cellLivrC);
		}
		tgaps.sort(AC.Sort.i);
		for(var i = 0, x = null; x = tgaps[i]; i++)
			this.gaps.push(x.code);
		
		this.twx = {nbTwb : 0, nbTwr : 0, twr : []};
		for ( var gx in this.listLivr) {
			var x = this.listLivr[gx].cellTweets.getNbTweets(this.gac);
			this.twx.nbTwb += x.black;
			this.twx.nbTwr += x.red;
			if (x.tw)
				this.twx.twr.push(x.tw);
		}
		this.lstLv = [];
		this.lstLvPhase = 0;
		this.totalGen = {type:"TG", nblg:0, prix:0, poids:0, suppl:0};
		for ( var i = 0, gx = 0; gx = this.gaps[i]; i++) {
			var lv = this.listLivr[gx];
			if (this.lstLvPhase < lv.phase)
				this.lstLvPhase = lv.phase;
			this.lstLv.push({gap:gx, codeLivr:lv.livr.codeLivr, phase:lv.phase});
			if (APP.Ctx.authUsr)
				var y = APP.Ctx.livrG.getAc(true, lv.livr.codeLivr, lv.livr.gap, APP.Ctx.authUsr);
			else
				var y = APP.Ctx.livrG.getGac(true, lv.livr.codeLivr, lv.livr.gap);
			this.totalGen.nblg += y.nblg;
			this.totalGen.prix += y.prix;
			this.totalGen.suppl += y.suppl;
			this.totalGen.poids += y.poids;
			var r = lv.cellLivrC.getBdls(0, lv.ctlg);
			lv.bdl = r.bdl;
			lv.cpts = r.cpts;
			lv.flags = r.flags;
		}
		
		this.allAcs = [];
		if (!APP.Ctx.authUsr){
			var lstc = this.cellGrp.getAllContacts();
			for(var i = 0, c = null; c = lstc[i]; i++){
				if (c.suppr && c.suppr < this.moisMoins2)
					continue;
				var x = APP.Ctx.livrG.getClAc(this.lstLv, c.code);
				x.elt = c;
				this.allAcs.push(x);
			}
		} else {
			var x = APP.Ctx.livrG.getClAc(this.lstLv, APP.Ctx.authUsr);
			x.elt = this.cellGrp.get(APP.Ctx.authUsr);
			this.allAcs.push(x);
		}

	},
		
	getPresenceJour : function(jour){
		var p = this.presences[jour];
		return {matin:p.matin ? p.matin : [], apm:p.apm ? p.apm : []};
	},
	
	nbPresences : function(){
		this.nbVolontaires = 0;
		this.volontaires = {};
		for (var i = 1; i <= 7 ;i++){
			var p = p = this.getPresenceJour(i);
			for(var j = 0, v = 0; v = p.matin[j]; j++) {
				var x = this.volontaires[v];
				if (x)
					this.volontaires[v]++;
				else
					this.volontaires[v] = 1;
			}
			for(var j = 0, v = 0; v = p.apm[j]; j++) {
				var x = this.volontaires[v];
				if (x)
					this.volontaires[v]++;
				else
					this.volontaires[v] = 1;
			}
		}
		for(var v in this.volontaires)
			this.nbVolontaires++;
	},
	
	getLv : function(gac){
		return this.listLivr[gac];
	}
	
}
AC.declare(AC.DT1, AC.DT);

/****************************************************************/
AC.DTGac = function(){} // acTDc
AC.DTGac._static = {
	maskFlagD : AC.Flag.QMAX | AC.Flag.FRUSTRATION | AC.Flag.PAQUETSAC | AC.Flag.PARITE | AC.Flag.DISTRIB 
		 | AC.Flag.EXCESTR | AC.Flag.PERTETR | AC.Flag.PAQUETSC | AC.Flag.PAQUETSD | AC.Flag.NONCHARGE,
		 
    maskCptD : ["cmdNch", "cmdNdch", "chNcmd", "dchNcmd"],
    
	maskFlagC : AC.Flag.QMAX | AC.Flag.FRUSTRATION | AC.Flag.PARITE,
	
	maskCptC : [],
	
	maskFlagLC : AC.Flag.PARITE,

	maskFlagLD : AC.Flag.PARITE | AC.Flag.DISTRIB 
	 | AC.Flag.EXCESTR | AC.Flag.PERTETR | AC.Flag.PAQUETSC | AC.Flag.PAQUETSD | AC.Flag.NONCHARGE,

	maskCptL : ["cmdNch", "cmdNdch", "chNcmd", "dchNcmd", "cmdETch", "cmdETdch"],
	
	maskFlagACC : AC.Flag.QMAX | AC.Flag.FRUSTRATION | AC.Flag.PARITE,

	maskCptACC : ["cmdETdch"],

	maskFlagACD : AC.Flag.QMAX | AC.Flag.FRUSTRATION | AC.Flag.PAQUETSAC | AC.Flag.PARITE | AC.Flag.DISTRIB | AC.Flag.NONCHARGE,

	maskCptACD : ["cmdETdch"],

	/*
	maskCpt : ["cmdNch", "cmdNdch", "chNcmd", "dchNcmd", "cmdETch", "cmdETdch"],
	maskFlag : AC.Flag.QMAX | AC.Flag.FRUSTRATION | AC.Flag.PAQUETSAC | AC.Flag.PARITE | AC.Flag.DISTRIB 
	 | AC.Flag.EXCESTR | AC.Flag.PERTETR | AC.Flag.PAQUETSC | AC.Flag.PAQUETSD | AC.Flag.NONCHARGE, 
	*/

	allAc : false,
	
	html1 : "<div id='volontaires' class='btn2' data-index='0'></div>"
		+ "<div class='acSpace1'></div>"
		+ "<div id='fiches'><div class='subSectionT'>Livraisons des groupements "
//		+ "<span  class='subSectionT2'>[Bons de livraison / distribution, Synthèse producteurs, Excel ]</span>"
		+ "</div><div class='subSectionB'><div id='fichesGAP'></div></div>"
		+ "<div class='subSectionT'>Commandes des alterconsos </div><div class='subSectionB'>"
		+ "<div class='btnL2'><div id='export' class='btn4 acxx'>Export Excel Synthèse</div>"
		+ "<div class='btnT2'>synthèse globale, 1 seul onglet</div></div>"
		+ "<div class='btnL2'><div id='exportD' class='btn4 acxx'>Export Excel Détaillé</div>"
		+ "<div class='btnT2'>synthèse globale et détaillée avec un onglet par alterconso</div></div>"
		+ "<div class='btnL2'><div id='import' class='btn4 acxx'>Import Excel </div>"
		+ "<div class='btnT2'>d'une commande d'un alterconso</div></div>"
		+ "<div class='btnL2'><div id='paniers' class='btn4 big' data-index='0'>Etat de distribution </div>"
		+ "<div class='btnT2'>remplissage des paniers des alterconsos</div></div>"
		+ "<div class='btnL2'><div id='comptas' class='btn4 big' data-index='0'>Comptabilité </div>"
		+ "<div class='btnT2'>état comptable des alterconsos</div></div>"
		+ "<div class='acSpace1' data-ac-id='allAc'></div>"
		+ "<div id='fichesAC'></div></div></div>",
		
}
AC.DTGac._proto = {
	className : "DTGac",
		
	init : function(aammjj){
		this.elt1 = APP.Ctx.loginGrp.get(1);
		AC.ac2._contentDT.html(AC.DTGac.html1);
		this._content = AC.ac2._contentDT;
		
		this._fichesGAP = AC.ac2._contentDT.find("#fichesGAP");
		this._fichesAC = AC.ac2._contentDT.find("#fichesAC");
		this.fsetGAP = new AC.FicheSet(this, "GAP", this._fichesGAP);
		this.fsetAC = new AC.FicheSet(this, "AC", this._fichesAC);
		
		new AC.CheckBox2(this, "allAc", "Voir AUSSI les alterconsos n'ayant PAS commandé");
		this._allAc.val(AC.DTGac.allAc);
		var self = this;
		this._allAc.jqCont.off("dataentry").on("dataentry", function(){
			AC.DTGac.allAc = self._allAc.val();
			self.display();
		});

		AC.oncl(this, this._content.find("#volontaires"), function(){
			new AC.Volontaires().init();
		});

		AC.oncl(this, AC.ac2._contentDT.find("#paniers"), function(){
			new AC.EcGapGacAc().init(0, true);
		});
		
		AC.oncl(this, AC.ac2._contentDT.find("#comptas"), function(){
			new AC.EcGapGacAc().init(0, false);
		});

		AC.oncl(this, AC.ac2._contentDT.find(".acxx"), function(target){
			var a = "action_" + target.attr("id");
			if (this[a])
				this[a]();
		});
		this.acSynth = null;
		return AC.DT1.prototype.init.call(this, aammjj);
	},
	
	repaint : function(){
		var _volontaires = this._content.find("#volontaires");
		if (!this.elt1.novol) {
			if (this.nbVolontaires == 0) {
				if (!this.semainePassee)
					var vl = "&nbsp;Pas encore de volontaires pour décharger ";
				else
					var vl = "&nbsp;Pas de volontaires pour décharger ";
			} else if (this.nbVolontaires == 1)
				var vl = "&nbsp;Un volontaire pour décharger ";
			else
				var vl = "&nbsp;" + this.nbVolontaires + " volontaires pour décharger ";
			_volontaires.css("display", "block");
			_volontaires.html(vl);
		} else
			_volontaires.css("display", "none");
		
		var fichesGAP = {};
		APP.colorPaire = true;
		for ( var gx in this.listLivr) {
			var gap = parseInt(gx, 10);
			var lv = this.listLivr[gx];
			var elt = lv.cellGap.enumElt();
			fichesGAP[gx] = {type:"Gap", gap:gap, tri:"G"+elt.initiales, id:""+gap, 
					color:APP.altc(elt.color), model:"GAP"};
		}
		this.fsetGAP.repaint(fichesGAP);
		
		var fichesAC = {};
		APP.colorPaire = true;
		for(var i = 0, x = null; x = this.allAcs[i]; i++){
			if (AC.DTGac.allAc || x.status == 2 || x.ac == 1)
				fichesAC[x.ac] = {tri:(x.ac <= 1 ? "0" : "1") + x.elt.initiales, x:x, id:x.ac, 
					color:APP.altc(x.elt.color)};
		}
		this.fsetAC.repaint(fichesAC);
		AC.oncl(this, this._fichesAC.find(".lnkPhoto"), function(target){
			AC.StackG.show({type:"Ac", gac:APP.Ctx.authGrp, ac:Util.dataIndex(target)});	
		});
	},
	
	paintTitleGAP : function(fi){
		var lv = this.listLivr[fi.gap];
		var sb = new StringBuffer();
		sb.append("<div class='fTitleInner'>");
		AC.LV.slv1(sb, lv.slivr, "-p", Util.adresse2(lv.cellGac.get(1), lv.slivr));
		sb.append("</div>");
		return sb.toString();
	},

	registerTitleGAP : function(fi, _title){
		AC.oncl(this, _title, function(target){
			this.fsetAC.hide();
			this.fsetGAP.showHide(Util.dataIndex(target));
		});
		AC.oncl(this, _title.find(".bdlbtn"), function(target){
			this.regbdlc(fi, true);
		});
		AC.oncl(this, _title.find(".bddbtn"), function(target){
			this.regbdlc(fi, false);
		});
		AC.oncl(this, _title.find(".etcbtn"), function(target){
			this.regbdlc(fi, null);
		});
		AC.ac2.viewLV.registerClock(_title);
	},
	
	regbdlc : function(fi, bdlc){
		if (this.fsetGAP.ficheVisible != fi.id) {
			this.fsetGAP.showHide(fi.id);
			this.fsetAC.hide();
		}
		if (bdlc != null)
			setTimeout(function() {
				new AC.Bdl().init(fi.id, !bdlc);
			}, 50);
	},

	paintBodyGAP : function(fi){
		var gap= fi.gap;
		var lv = this.listLivr[fi.gap];
		var slivr = lv.slivr;
		var estMono = lv.cellGap.estMono();
		var sb = new StringBuffer();
		
		if (APP.Ctx.authUsr) {
			var x = APP.Ctx.livrG.getAc(true, slivr.codeLivr, gap, APP.Ctx.authUsr);
		} else {
			var x = APP.Ctx.livrG.getGac(true, slivr.codeLivr, gap);
		}
		
		new AC.CptEdit().init(sb, x).all();
				
		sb.append("<div class='acRetrait'>");

		sb.append("<div class='btnL2'><div id='exportG' class='btn4'>Export Excel Synthèse</div>");
		sb.append("<div class='btnT2'> synthèse globale, 1 seul onglet</div></div>");
		sb.append("<div class='btnL2'><div id='exportGD' class='btn4'>Export Excel Détaillé</div>");
		sb.append("<div class='btnT2'> synthèse globale et détaillée avec un onglet par alterconso</div></div>");

		if (slivr.phase < 2){
			sb.append("<div class='btnL2'><div id='bdlc' class='btn4'>Bon de Commande</div>");
			sb.append("<div class='btnT2'>ajustement des commandes des alterconsos </div></div>");
			var s = AC.Flag.printTable(lv.cpts, AC.DTGac.maskCptC, lv.flags, AC.DTGac.maskFlagC);
			if (s)
				sb.append("<div class='acTB1'>").append(s).append("</div>");
		}
		
		sb.append("<div class='btnL2'><div id='bdl' class='btn4 big'>Bon de Livraison</div>");
		sb.append("<div class='btnT2'>déchargement du camion, saisies des poids / prix </div></div>");
		var s = AC.Flag.printTable(lv.cpts, AC.DTGac.maskCptL, lv.flags, 
				slivr.phase < 2 ? AC.DTGac.maskFlagLC : AC.DTGac.maskFlagLD);
		if (s)
			sb.append("<div class='acTB1' style='margin:0 0 0 1rem;'>").append(s).append("</div>");

		if (slivr.phase > 1){
			sb.append("<div class='btnL2'><div id='bdlc' class='btn4 big'>Bon de Distribution</div>");
			sb.append("<div class='btnT2'>répartition dans les paniers  </div></div>");
			var s = AC.Flag.printTable(lv.cpts, AC.DTGac.maskCptD, lv.flags, AC.DTGac.maskFlagD);
			if (s)
				sb.append("<div class='acTB1' style='margin:0 0 0 1rem;'>").append(s).append("</div>");
			var mx = "Comptabilité " + (estMono ? "du producteur" : "des producteurs");
			sb.append("<div class='btnL2'><div id='comptaAP' class='btn4'>" + mx + "</div>");
			sb.append("<div class='btnT2'>justification des débits / crédits </div></div>");
			sb.append("<div class='btnL2'><div id='synthBtn' class='btn4'>Synthèse par producteur </div></div><div id='synthProd'>");
			sb.append(new AC.RecapCompta(lv.cellLivrC, 0).print());
			sb.append("</div>");
		}
		sb.append("</div>");
		return sb.toString();
	},

	registerBodyGAP : function(fi, _body){
		var lv = this.listLivr[fi.gap];
		this._synthProd = _body.find("#synthProd");
		AC.oncl(this, _body.find("#synthBtn"), function(){
			var x = this._synthProd.css("display");
			this._synthProd.css("display", x == "none" ? "block" : "none");
		});
		AC.oncl(this, _body.find("#bdl"), function(){
			new AC.Bdl().init(fi.id, false);
		});
		AC.oncl(this, _body.find("#bdlc"), function(){
			new AC.Bdl().init(fi.id, true);
		});
		AC.oncl(this, _body.find("#comptaAP"), function(){
			new AC.EcGap(AC.ac2.viewDT.listLivr[fi.id].cellLivrC);
		});
		AC.oncl(this, _body.find("#exportG"), function(){
			this.action_exportG(lv.cellGap);
		});
		AC.oncl(this, _body.find("#exportGD"), function(){
			this.action_exportGD(lv.cellGap);
		});
	},
	
	paintTitleAC : function(fi){
		var x = fi.x;
		var sb = new StringBuffer();
		var url = x.elt.url ? x.elt.url : "images/default-64x64.jpg";
		sb.append("<div class='fTitleInner'>");
		sb.append("<div class='v2Rowh' data-index='" + x.ac + "'>");
		sb.append("<img class='photo2' src='" + url + "'/>");
		sb.append("<div class='v2Text'>");
		sb.append("<div class='lnkPhoto action2'>Voir le profil</div>");
		sb.append("<div class='acsIL large bold'>" + x.elt.initiales + " - " + x.elt.nom);
		if (x.elt.suppr)
			sb.append("<span class='italic red'> [Annulé depuis " + x.elt.suppr + "]</span>");
		sb.append("</div>");
		sb.append("</div>");		
		new AC.Cpt().init(sb, x, "-p", x.phase < 2 ? AC.DTGac.maskFlagACC : AC.DTGac.maskFlagACD);
		sb.append("<div class='acEnd'></div>");
		sb.append("</div></div>");
		return sb.toString();
	},

	registerTitleAC : function(fi, _title){
		AC.oncl(this, _title, function(target){
			this.fsetGAP.hide();
			this.fsetAC.showHide(Util.dataIndex(target));
		});
	},

	onHideAC : function(){
		this.acSynth = null;
	},
	
	paintBodyAC : function(fi){
		this.acSynth = new AC.AcSynth(fi.id);
		return this.acSynth.repaint();
	},

	registerBodyAC : function(fi, _body){
		if (this.acSynth)
			this.acSynth.register(_body);
	},
	
	action_export : function(){
		var i1 = AC.GAC.elt(APP.Ctx.authGrp).initiales;
		AC.Req.submitForm("54", "alterconsos/export/AC_" + this.date + "_" + i1 + ".xls", this.date);
	},

	action_exportG : function(cellGap){
		var i2 = cellGap.get(1).initiales;
		var i1 = AC.GAC.elt(APP.Ctx.authGrp).initiales;
		AC.Req.submitForm("54", "alterconsos/export/AC_" + this.date + "_" + i2 + "_" + i1 + ".xls", 
				this.date, 0, cellGap.code);
	},

	action_exportD : function(){
		var i = APP.Ctx.dir.getElement(1, APP.Ctx.authGrp).initiales;
		AC.Req.submitForm("58", "alterconsos/export/AC_DISTRIB_" + this.date + "_" 
				+ i + ".xls", this.date);
	},

	action_exportGD : function(cellGap){
		var i2 = cellGap.get(1).initiales;
		var i1 = AC.GAC.elt(APP.Ctx.authGrp).initiales;
		AC.Req.submitForm("58", "alterconsos/export/AC_DISTRIB_" + this.date + "_" + i2 + "_" + i1 + ".xls", 
				this.date, 0, cellGap.code);
	},

	action_import : function(){
		new AC.FormXLS(this.date);
	}
		
}
AC.declare(AC.DTGac, AC.DT1);

/****************************************************************/
AC.DTAc = function(){}
AC.DTAc._static = {
	html1 : "<div id='volontaires' class='btn2' data-index='0'></div>"
		+ "<div class='acSpace1'></div>"
}
AC.DTAc._proto = {
	className : "DTAc",

	init : function(aammjj){
		this._content = AC.ac2._contentDT;
		this.elt1 = APP.Ctx.loginGrp.get(1);
		return AC.DT1.prototype.init.call(this, aammjj);
	},
	
	repaint : function(forced){
		this.acSynth = new AC.AcSynth(APP.Ctx.authUsr);
		var sb = new StringBuffer();
		sb.append(AC.DTAc.html1);
		sb.append("<div id='fiches'>");
		sb.append(this.acSynth.repaint())
		sb.append("</div>");
		this._content.html(sb.toString());
		this.acSynth.register(this._content);
		var _volontaires = this._content.find("#volontaires");
		if (!this.elt1.novol) {
			if (this.nbVolontaires == 0) {
				if (!this.semainePassee)
					var vl = "&nbsp;Pas encore de volontaires pour décharger";
				else
					var vl = "&nbsp;Pas de volontaires pour décharger";
			} else if (this.nbVolontaires == 1)
				var vl = "&nbsp;Un volontaire pour décharger";
			else
				var vl = "&nbsp;" + this.nbVolontaires + " volontaires pour décharger";
			if (!this.semainePassee && !this.volontaires[this.ac])
				vl += ". Et vous ?";
			_volontaires.css("display", "block");
			_volontaires.html(vl);
		} else
			_volontaires.css("display", "none");
	
		AC.oncl(this, _volontaires, function(){
			new AC.Volontaires().init();
		});
	}
		
}
AC.declare(AC.DTAc, AC.DT1);

/****************************************************************/
AC.Volontaires = function(){}
AC.Volontaires._static = {
	voir : 0,
	tri : 2,
    kbpref : [{code:0, label:"Je préfère la saisie au clavier"},
             {code:1, label:"Je préfère la saisie tactile / souris"}],
}
AC.Volontaires._proto = {
	className : "Volontaires",
	
	init : function(){
		this.ac = AC.ac2.viewDT.ac;
		this.gac = AC.ac2.viewDT.gac;
		this.dlu = AC.ac2.viewDT.dlu;
		this.cellGac = AC.GAC.getN(this.gac);
		if (this.ac)
			this.eltAc = this.cellGac.get(this.ac);
		return AC.Screen.prototype.init.call(this, AC.ac2.viewDT);
	},
	
	compile : function(){
		this.eltGac = this.cellGac.get(1);
		if (this.eltGac == null){
			var x = APP.Ctx.dir.getElement(1, this.cellGac.code);
			this.eltGac = {initiales:x.initiales, nom:x.label};
		}
		this.localisation = this.eltGac.localisation;

		this._valider.css("display", "none");
		this._annuler.css("display", "none");
		this.volontaires = AC.ac2.viewDT.volontaires;
		this.nbVolontaires = AC.ac2.viewDT.nbVolontaires;
		this.slivrSem = AC.ac2.viewDT.slivrSem;
		this.gaps = [null, {matin:[], apm:[]}, {matin:[], apm:[]}, {matin:[], apm:[]},
		             {matin:[], apm:[]}, {matin:[], apm:[]}, {matin:[], apm:[]}, {matin:[], apm:[]}];
		for(var i = 0, sl = null; sl = this.slivrSem[i]; i++){
			var jl = AC.AMJ.js(sl.dlivr);
			var matinl = sl.hlivr < 12;
			var jd = AC.AMJ.js(sl.distrib);
			var matind = sl.hdistrib < 12;
			var elt = APP.Ctx.dir.getElement(2, sl.gap, true);
			var lib = elt.initiales + "-" + elt.label;
			if (jl == jd && matinl == matind) {
				if (matinl)
					this.gaps[jl].matin.push(this.edGap(elt, false, sl.adresseL));
				else
					this.gaps[jl].apm.push(this.edGap(elt, false, sl.adresseL));
			} else {
				if (matinl)
					this.gaps[jl].matin.push(this.edGap(elt, false, sl.adresseL));
				else
					this.gaps[jl].apm.push(this.edGap(elt, false, sl.adresseL));
				if (matind)
					this.gaps[jd].matin.push(this.edGap(elt, true, sl.adresseD));
				else
					this.gaps[jd].apm.push(this.edGap(elt, true, sl.adresseD));
			}	
		}
		this.RW = !AC.ac2.viewDT.semainePassee;
	},
	
	edGap : function(elt, distrib, ad){
		var adx = ad ? ad : this.localisation;
		var sb = new StringBuffer();
		sb.append("<div class='Col4Div'><img class='img2rem' src='images/fl" 
				+ (distrib ? 3 : 6) + ".png'></img>");
		sb.append("[" + elt.initiales + "] " + elt.label);
		sb.append(Util.adresse(adx));
		sb.append("</div>");
		return sb.toString();
	},
	
	edAc : function(ac, js, matin){
		var elt = this.cellGac.get(ac);
		if (this.ac && ac == this.ac)
			return "<div class='Col4Div presence red' data-index='" + ac + "' data-js='" + js + 
				"' data-matin='" + matin + "'>[" + elt.initiales + "] " + elt.nom + "</div>";
		if (!this.ac)
			return "<div class='Col4Div presence' data-index='" + ac + "' data-js='" + js + 
				"' data-matin='" + matin + "'>[" + elt.initiales + "] " + elt.nom + "</div>";
		return "<div class='Col4Div bold italic'>[" + elt.initiales + "] " + elt.nom + "</div>";			
	},

	edBtn : function(js, matin){
		var s = "<div class='acInscription talc' data-js='" + js + 
		"' data-matin='" + matin + "'>";
		if (this.ac)
			return s + "S'inscrire</div>";
		else
			return s + "Inscrire un alterconso</div>";
	},
	
	paintTitle : function(){
		var sb = new StringBuffer();
		var dl = AC.AMJ.dateLongue(this.dlu)
		sb.append("<div class='bold italic large'>Vontaires pour décharger pour la semaine du " + dl + "</div>");
		sb.append("<div class='acAdresse medium'>");
		sb.append("<div class='bold'>Groupe : " + this.eltGac.nom.escapeHTML() + "</div>");
		if (this.localisation){
			sb.append(Util.adresse(this.localisation));
//			sb.append("<div><div class='acMapsBtn noprint' data-index='1'></div>");
//			sb.append(eltGac.localisation.escapeHTML());
//			sb.append("<div class='acEnd'></div></div>");
		} else
			sb.append("<div>Localisation non renseignée</div>");
		sb.append("</div>");
		sb.append("<div class='acEnd'></div>");
		return sb.toString();
	},
	
	paintContent : function(){
		var dt = AC.ac2.viewDT;
		var sb = new StringBuffer();
		if (this.ac && this.volontaires[this.ac])
			sb.append("<div class='orange bold italic'>Cliquer sur votre nom pour le désinscrire "
					+ "d'un matin ou d'une après-midi</div><div class='acSpace2'></div>");
		if (!this.ac && this.nbVolontaires)
			sb.append("<div class='orange bold italic'>Cliquer le nom d'un alterconso pour le désinscrire "
					+ "d'un matin ou d'une après-midi</div><div class='acSpace2'></div>");
		if (!this.ac){
			sb.append("<div style='display:none'><div class='acdd-box'>"
					+ "<div class='acdd-value2 italic' data-ac-id='selectusr'></div></div></div>");
		}
		var tb = new AC.Table(3, true, true, [2, 4, 4]);
		tb.clazz("inverse talc");
		tb.row("Jour de semaine", "Matin", "Après midi")
		for(var js = 1; js <= 7; js++){
			var pj = dt.getPresenceJour(js);
			var matin = [];
			var found = false;
			for(var i = 0, s = null; s =  this.gaps[js].matin[i]; i++)
				matin.push(s);
			if (pj.matin.length != 0){
				if (matin.length != 0)
					matin.push("&nbsp;");
				for(var i = 0, ac = null; ac =  pj.matin[i]; i++) {
					if (this.ac && this.ac == ac)
						found = true;
					matin.push(this.edAc(ac, js, 1));
				}
			}
			if (this.RW && !found)
				matin.push(this.edBtn(js, 1));
			var apm = [];
			found = false;
			for(var i = 0, s = null; s =  this.gaps[js].apm[i]; i++)
				apm.push(s);
			if (pj.apm.length != 0){
				if (apm.length != 0)
					apm.push("&nbsp;");
				for(var i = 0, ac = null; ac =  pj.apm[i]; i++) {
					if (this.ac && this.ac == ac)
						found = true;
					apm.push(this.edAc(ac, js, 0));
				}
			}
			if (this.RW && !found)
				apm.push(this.edBtn(js, 0));
			tb.row("<b><i>" + AC.AMJ.joursLongs[js - 1] + "</i></b>", matin.join(""), apm.join(""));
		}
		sb.append(tb.flush());
		sb.append("</div>");
		return sb.toString();
	},

	register : function(){
		AC.oncl(this, this._title.find(".acMapsBtn"), function(target){
			new AC.Maps().init(this.cellGac.get(1));
		});
		AC.oncl(this, this._content.find(".acInscription"), function(target){
			var js = Util.dataIndex(target, "js");
			var matin = Util.dataIndex(target, "matin");
			if (this.ac)
				this.inscrire(js, matin);
			else
				this.choixVolontaire(js, matin);
		});
		AC.oncl(this, this._content.find(".presence"), function(target){
			var js = Util.dataIndex(target, "js");
			var matin = Util.dataIndex(target, "matin");
			var code = Util.dataIndex(target);
			this.desinscrire(js, matin, code);
		})
	},

	desinscrire : function(js, matin, code){
		if (this.ac && code != this.ac)
			return;
		var arg = {op:"20"};
		arg.gac = this.cellGac.code;
		arg.code = code;
		arg.lundi = this.dlu;
		arg.jour = js;
		arg.matin = matin;
		arg.plus = 0;
		arg.operation = "Désinscription en tant que volontaire";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Désinscription faite");
		}, "Echec de la désinscription : ");
	},

	inscrire : function(js, matin, code){
		var arg = {op:"20"};
		arg.gac = this.cellGac.code;
		arg.code = code ? code : this.ac;
		arg.lundi = this.dlu;
		arg.jour = js;
		arg.matin = matin;
		arg.plus = 1;
		arg.operation = "Inscription en tant que volontaire";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Inscription faite");
		}, "Echec de l'inscription : ");
	},
	
	choixVolontaire : function(js, matin){
		var annuler = "<div class='acdd-itemValue color0 bold'>Annuler</div>";
		var decor = APP.Ctx.loginGrp.decor(annuler, function(elt){
			return elt.suppr ? null : elt.initiales;
		}, true);
		var sel = new AC.Selector3(this, "selectusr", decor, "(annuler)");
		var self = this;
		sel.jqCont.off("dataentry").on("dataentry", function(){
			var code = sel.val();
			if (code)
				self.inscrire(js, matin, code);
		});
		sel.show();
	}
	
}
AC.declare(AC.Volontaires, AC.Screen);

/****************************************************************/
AC.AcSynth = function(ac){
	this.caller = AC.ac2.viewDT;
	this.cellGac = APP.Ctx.loginGrp;
	this.ac = ac;
	this.eltAc = this.cellGac.get(ac);
	this.date = this.caller.date;
	this.clAc = APP.Ctx.livrG.getClAc(this.caller.lstLv, this.ac);
}
AC.AcSynth._static = {
		
}
AC.AcSynth._proto = {
	className : "AcSynth",
	
	repaint : function() {
		var sb = new StringBuffer();
		new AC.CptEdit().init(sb, this.clAc).all();
		
		sb.append("<div class='acRetrait'>")

		sb.append("<div class='btnL2'><div id='exportAc' class='actionX btn4'>Export vers Excel</div>");
		sb.append("<div class='btnT2'> des commandes pour ce jour uniquement pour [" + this.eltAc.initiales + "]</div></div>");
		sb.append("<div class='btnL2'><div id='import' class='actionX btn4'>Import depuis Excel</div>");
		sb.append("<div class='btnT2'> des commandes pour ce jour uniquement pour [" + this.eltAc.initiales + "]</div></div>");
		sb.append("<div class='btnL2'><div class='comptas btn4' data-index='" + this.ac + "'>Comptabilité</div>");
		sb.append("<div class='btnT2'> uniquement pour [" + this.eltAc.initiales + "]</div></div>");
		sb.append("<div data-ac-id='detail'></div>");
		sb.append("<div class='acSpace1'></div>");

		for ( var i = 0, gx = 0; gx = this.caller.gaps[i]; i++)
			sb.append("<div class='embedScreen' data-index='" + gx + "'></div>");
		
		sb.append("</div>");
		return sb.toString();
	},
	
	register : function(_body) {
		this._content = this.caller._content;
		this._content.find(".detail").css("display", AC.ac2.detail ? "block" : "none");
		this._content.find(".ildetail").css("display", AC.ac2.detail ? "inline-block" : "none");
		var self = this;
		new AC.CheckBox2(this, "detail", "Vues détaillées");
		this._detail.val(AC.ac2.detail);
		this._detail.jqCont.off("dataentry").on("dataentry", function(){
			AC.ac2.detail = self._detail.val();
			self._content.find(".detail").css("display", AC.ac2.detail ? "block" : "none");
			self._content.find(".ildetail").css("display", AC.ac2.detail ? "inline-block" : "none");
		});

		var ac = this.ac
		_body.find(".embedScreen").each(function(){
			var _e = $(this);
			var gap = parseInt(_e.attr("data-index"), 10);
			new AC.Bdc().init(gap, ac, _e);
		});
		AC.oncl(this, _body.find(".comptas"), function(target){
			new AC.EcGapGacAc().init(Util.dataIndex(target), false);
		});
		AC.oncl(this, _body.find(".actionX"), function(target){
			var a = "action_" + target.attr("id");
			if (this[a]) 
				this[a](this.ac);
		});
	},
	
	action_exportAc : function(ac){
		var i2 = this.eltAc.initiales;
		var i1 = this.cellGac.get(1).initiales;
		AC.Req.submitForm("54", "alterconsos/export/AC_" + this.date + "_" + i1 + 
				"_" + i2 + ".xls", this.date, ac);
	},
	
	action_import : function(){
		new AC.FormXLS(this.date);
	}

}
AC.declare(AC.AcSynth);

/****************************************************************/
AC.Bdc = function(){}
AC.Bdc._static = {
	voir : 0,
	tri : 2,
	alert1 : "Cette livraison est ANNULEE. La saisie / modification de la quantité "
		+ " ne sera effective qu'au cas où la livraison serait ré-activée.",
    kbpref : [{code:0, label:"Je préfère la saisie au clavier"},
             {code:1, label:"Je préfère la saisie tactile / souris"}],
}
AC.Bdc._proto = {
	className : "Bdc",
	
	init : function(gap, ac, _embed){
		this._embed = _embed;
		this.gap = gap;
		this.ac = ac;
		this.changed = {};
		this.lv = AC.ac2.viewDT.listLivr[this.gap];
		this.mono = this.lv.cellGap.estMono();
		this.cellGac = AC.GAC.getN(this.lv.slivr.gac);
		this.cellGap = this.lv.cellGap;
		this.codeLivr = this.lv.livr.codeLivr;
		this.eltAc = this.cellGac.get(this.ac);
		return AC.Screen.prototype.init.call(this, AC.ac2.viewDT, _embed);
	},
	
	compile : function(){
		this.lv = AC.ac2.viewDT.listLivr[this.gap];
		this.mono = this.lv.cellGap.estMono();
		this.lvAc = AC.DT1.lvPlusAc(this.lv, this.ac);
		this.xAc = this.lv.cellLivrC.getAc(true, this.ac);
		this.phase = this.lv.slivr.phase;
		this.ann = this.lv.livr.suppr || this.lv.slivr.suppr;
		this.maskFlag = this.phase < 2 ? AC.DTGac.maskFlagACC : AC.DTGac.maskFlagACD;
		this.maskCpt = this.phase < 2 ? [] : AC.DTGac.maskCptACD;
		if (this.lv.livr.phase <= 0)
			this.RWmsg = "Cette livraison N'EST PAS encore ouverte aux commandes";
		else if (this.lv.livr.phase >= 4)
			this.RWmsg = "Cette livraison est archivée et N'EST PLUS modifiable";
		if (APP.Ctx.authUsr) {
			this.RW = this.lv.livr.phase == 1;
			if (this.lv.livr.phase > 1 && this.lv.livr.phase < 4)
				this.RWmsg = "Cette livraison N'EST PLUS ouverte aux commandes pour les alterconsos.\n"
					+ "Contacter un animateur de votre groupe qui pourra peut-être faire quelque chose";
		} else {
			var phx = AC.Context.phases[APP.Ctx.cal.getStatut(this.lv.slivr, true)];
			this.RW = phx == 1 || phx == 3 ;
			this.RWLP = phx == 3 ;
			if (phx == 2) 
				this.RWmsg = "Cette livraison N'EST PLUS modifiable pour les responsables de groupes jusqu'au début du déchargemnet.\n"
					+ "Contacter l'animateur du groupement pour qu'il recule la date et l'heure limite de commande.";
		}
			//	0 : "pas encore ouverte"
			//	1 : "ouverte aux commandes"
			//	2 : "en chargement ou en transport"
			//	3 : "en déchargement / distribution des paniers"
			//	4 : "archivée"
	},
	
	paintTitle : function(){
		var sb = new StringBuffer();
		var eltGap = this.lv.cellGap.get(1);
		var eltGac = this.lv.cellGac.get(1);
		if (eltGap == null){
			var x = APP.Ctx.dir.getElement(2, this.lv.cellGap.code);
			eltGap = {initiales:x.initiales, nom:x.label}
		}
		if (eltGac == null){
			var x = APP.Ctx.dir.getElement(1, this.lv.cellGac.code);
			eltGac = {initiales:x.initiales, nom:x.label}
		}
		if (!this._embed) {
			sb.append("<div class='barTop'><div class='titreS'>");
			var dl = AC.AMJ.dateLongue(this.lv.slivr.distrib)
			var lb = this.lv.livr.phase > 1 ? "Distribution" : "Commande";
			sb.append("Bon de " + lb + " - Distribution du " + dl);
			if (this.ann)
				sb.append("<span class='redlabel'>***ANNULEE*** </span>");
			sb.append("</div></div>");
			
			sb.append("<div class='tableA'><div class='trA0'>");
			
			sb.append("<div class='tdA' style='width:50%'>");
			sb.append("<div class='tdAdresse'><div>Groupement Expéditeur : " + eltGap.nom.escapeHTML() + "</div>");
			if (eltGap.localisation){
				sb.append(Util.adresse(eltGap.localisation));
			} else
				sb.append("<div>Localisation non renseignée</div>");
			sb.append("</div></div>");
			
			sb.append("<div class='tdB' style='width:50%'>");
			sb.append("<div class='tdAdresse'><div>Destinataire : " + this.eltAc.nom.escapeHTML() +
					" du groupe " + eltGac.nom.escapeHTML() + "</div>");
			sb.append(Util.adresse2(eltGac, this.lv.slivr));
			sb.append("</div></div>");
			
			sb.append("</div></div>");
		} else {
			var text = eltGap.initiales + " - " + eltGap.nom.escapeHTML()
				+ " <span class='italic normal'>[" + AC.ac2.nomPhases[this.phase] + "]</span>" 
				+ (!this.ann ? "" : "<span class='redlabel'>***ANNULEE*** </span>");
			if (this.mono)
				sb.append("<div class='large bold acNomAp' data-index='1'>" 
						+ text + "</div></div>");
			else
				sb.append("<div class='large bold acNomGap' data-index='1'>" 
						+ text + "</div></div>");
			sb.append("<div class='medium maFonteA'>");
			this.lvGAC(sb, this.lv.slivr, eltGac);
			sb.append(Util.adresse2(eltGac, this.lv.slivr));
			sb.append("</div>");
		}
		return sb.toString();
	},
	
	lvGAC : function(t, slivr, elt){
		if (slivr.statut == 2){
			t.append("<div class='acsIL'>Limite " + AC.AMJ.dateTCourte(slivr.livr.limite));
			if (slivr.livr.hlimite)
				t.append(" à " + slivr.livr.hlimite + "h");
			t.append("; </div>");
		}
		var jjd = AC.AMJ.dateTCourte(slivr.distrib);
		var jjl = AC.AMJ.dateTCourte(slivr.dlivr);
		if (APP.Ctx.authUsr) {
			t.append("<div class='acsIL'>Distribution " + jjd);
			if (slivr.hdistrib) { 
				if (!slivr.fdistrib)
					t.append(" à partir de " + slivr.hdistrib + "h</div>");
				else
					t.append(" de " + slivr.hdistrib + "h à " + slivr.fdistrib + "h</div>");
			} else
				t.append("</div>");
		} else {
			t.append("<div class='acsIL'>Livraison " + jjl);
			if (slivr.hlivr)
				t.append(" à  " + slivr.hlivr + "h; </div>");
			else
				t.append("; </div>");
			t.append("<div class='acsIL'>Distribution " + jjd);
			if (slivr.hdistrib) { 
				if (!slivr.fdistrib)
					t.append(" à partir de " + slivr.hdistrib + "h</div>");
				else
					t.append(" de " + slivr.hdistrib + "h à " + slivr.fdistrib + "h</div>");
			} else
				t.append("</div>");
		}
	},

	paintContent : function(){
		var sb = new StringBuffer();
		sb.append("<div class='noprint'>");
		if (!this._embed) {
			sb.append("<div class='acCBBlock'><div class='acCBItem' data-ac-id='detail'></div></div>");
			sb.append("<div class='acsILB2'><div data-ac-id='voir'></div></div>");
			sb.append("<div class='acsILB2'><div data-ac-id='tri'></div></div>");
		} else {
			sb.append("<div class='btnL2'><div class='voirdetail btn4 big'>Voir tous les produits</div>");
			sb.append("<div class='btnT2'>ci-dessous ne figurent <span class='red bold moyen'>QUE les produits commandés</span></div></div>");
		}
		sb.append("</div>");
		sb.append("<div class='acTB1c'>");
		new AC.CptEdit().init(sb, this.xAc).all();
		sb.append("</div>");
		var s = AC.Flag.printTable(this.lvAc.cpts, this.maskCpt, this.lvAc.flags, this.maskFlag);
		if (s)
			sb.append("<div class='acTB1c'>").append(s).append("</div>");

		sb.append("<div class='noprint'>");
		sb.append("<div class='acsILB2'><div data-ac-id='keyboard'></div></div>");
		sb.append("</div>");

		sb.append("<div class='acSpace1'></div></div>");
		var tri = this._embed ? (this.mono ? 2 : 1) : AC.Bdc.tri;
		this.lvAc.bdl.sort([AC.Bdl.sortP, AC.Bdl.sortPP, AC.Bdl.sortR][tri]);
		if (this.paintContent2(sb, 0))
			sb.append("<div class='italic'>Aucun produit ne correspond aux critères de sélection</div>");
		return sb.toString();
	},

	register : function(){
		var _static = AC.Bdl;
		var self = this;
		if (!ISTOUCH && this.RW) {
			new AC.RadioButton(this, "keyboard", AC.Bdc.kbpref);
			this._keyboard.val(APP.Ctx.kbpref);			
			this._keyboard.jqCont.off("dataentry").on("dataentry", function(){
				APP.Ctx.kbpref = self._keyboard.val();
				AC.local("kbpref", "" + APP.Ctx.kbpref)
			});
		}

		if (!this._embed) {
			this.regDetail();
			this._valider.css("display", "none");
			this._annuler.css("display", "none");
			new AC.RadioButton(this, "voir", _static.dvoirC);
			this._voir.val(AC.Bdc.voir);
			
			new AC.RadioButton(this, "tri", this.mono ? _static.dtri1 : _static.dtri2);
			this._tri.val(AC.Bdc.tri);
			
			this._voir.jqCont.off("dataentry").on("dataentry", function(){
				AC.Bdc.voir = self._voir.val();
				self.display();
			});
			
			this._tri.jqCont.off("dataentry").on("dataentry", function(){
				AC.Bdc.tri = self._tri.val();
				self.display();
			});
		} else {
			AC.oncl(this, this._content.find(".voirdetail"), function(target){
				new AC.Bdc().init(this.gap, this.ac);
			});
		}
		
		AC.oncl(this, this._title.find(".acNomAp"), function(target){
			var ap = Util.dataIndex(target);
			AC.StackG.show({type:"Ap", gap:this.lv.cellGap.code, ap:ap});
		});

		AC.oncl(this, this._title.find(".acNomGap"), function(target){
			var ap = Util.dataIndex(target);
			AC.StackG.show({type:"Gap", gap:this.lv.cellGap.code});
		});

		AC.oncl(this, this._content.find(".acNomAp"), function(target){
			var ap = Util.dataIndex(target);
			AC.StackG.show({type:"Ap", gap:this.lv.cellGap.code, ap:ap});
		});

		AC.oncl(this, this._content.find(".acNomProd"), function(target){
			var prod = Util.dataIndex(target);
			AC.StackG.show({type:"Pr", gap:this.lv.cellGap.code, ap:Math.floor(prod / 10000), pr:prod % 10000});
		});
		
		var pqlst = this._content.find(".acLpqLst");
		var bxq = this._content.find(".bxQ");
		
		if (this.RW) {
			AC.oncl(this, bxq, function(target){
				if (this.lv.slivr.suppr)
					alert(this.constructor.alert1);
				if (!APP.Ctx.kbpref)
					new AC.KBQVInput().init(this, target);
				else
					new AC.KBQV().init(this, target);
			});
		} else {
			AC.oncl(this, bxq, function(target){
				alert(this.RWmsg);
			});
		}
		
		AC.oncl(this, pqlst, function(target){
			if (!APP.Ctx.authUsr) {
				if (this.RWLP) {
					var prod = Util.dataIndex(target);
					var typePrix = prod % 10;
					if (this.noedit(this.enEdition(), typePrix))
						if (typePrix == 2) {
							var prf = AC.KBLPGac2.prefNV ? AC.KBLPGac2nv : AC.KBLPGac2;
							new prf().init(this, this.lstChanged, target);
						} else {
							new AC.KBQP().init(this, this.qpChanged, target);
						}
				} else
					alert("La liste des paquets N'EST PAS accessible avant la livraison.");
			} else
				alert("La liste des paquets n'est accessible qu'aux animateurs.");					
		});
	},

	noedit : function(ed, typePrix){
		if (ed){
			if (typePrix == 2)
				alert("Des quantités et poids ont été saisis et pas encore validés."
						+ "\nLa saisie de nouveaux paquets ou la distribution de paquets existants est bloquée.\n"
						+ "Après fermeture de cette boîte et validation ou annulation de la saisie en cours "
						+ " la saisie des paquets sera à nouveau possible.");
			else
				alert("Des quantités et poids totaux ont été saisis et pas encore validés."
						+ "\nLa modification des attributions aux alterconsos est bloquée.\n"
						+ "Après fermeture de cette boîte et validation ou annulation de la saisie en cours"
						+ " la modification des attributions aux alterconsos sera à nouveau possible.");
			return false;
		}
		return true;
	},

	paintContent2 : function(sb, fs){
		var vide = true;
		var av = -1;
		var nbr = 0;
		var voir = this._embed ? 1 : AC.Bdc.voir;
		var tri = this._embed ? (this.mono ? 2 : 1) : AC.Bdc.tri;

		for(var i = 0, y = null; y = this.lvAc.bdl[i]; i++){			
			if (voir == 0) {
				if (!y.cv.dispo)
					continue;
			} else if (voir == 1) {
				// var b = y.cv.dispo == 4 || (y.acApPr && (y.acApPr.qte || y.acApPr.qteS 
				var b = (y.acApPr && (y.acApPr.qte || y.acApPr.qteS 
						|| (y.acApPr.lprix && y.acApPr.lprix.length != 0)));
				if (!b)
					continue;
			} else if (voir == 3) {
				if (y.cv.dispo)
					continue;
			}
			
			if (vide) {
				sb.append("<div class='tableA'>");
				this.ligneTitre(sb);
				vide = false;
			}
			if (tri == 1) {
				if (av != y.eltAp.code){
					var acAp = this.lv.cellLivrC.getAcAp(true, this.ac, y.eltAp.code);
					var po = "<b><i>" + INT.editKg(acAp.poids) + "</i></b>";
					var px = "<b><i>" + INT.editE(acAp.prix) + "</i></b>";
					this.lineSep(sb, "[" + y.eltAp.initiales + "] " + y.eltAp.nom.escapeHTML(), av == -1,
							"acNomAp", y.eltAp.code, po, px);
					av = y.eltAp.code;
				}
			} else if (tri == 2) {
				if (av != y.pd.rayon){
					this.lineSep(sb, AC.StepG1.rayons[y.pd.rayon], av == -1);
					av = y.pd.rayon;
				}				
			}
			this.line(sb, y, AC.Bdc.tri != 1 ? y.eltAp.initiales : null, nbr++);
		}
		if (!vide) {
			sb.append("</div>");
		}
		return vide;
	},

	lineSep : function(sb, text, pf, cl, di, po, px) {
		if (!po) po = "";
		if (!px) px = "";
		
		sb.append("<div class='acTR2Text'>");
		
		sb.append("<div class='tdW'><div class='tdWT'>");
		var cldi = (cl ? " " + cl + "'" : "'") + (di ? " data-index='" + di + "'" : "");
		if (di)
			sb.append("<div class='acSPl3c" + cldi + ">" + text + "</div>");
		else
			sb.append("<div class='acSPl3c" + cldi + ">" + text + "</div>");
		sb.append("</div></div>");

		sb.append("<div class='tdW'></div><div class='tdW'></div>");
		sb.append("<div class='tdW talcB2'>" + po + "</div>");
		sb.append("<div class='tdW talcB2'>" + px + "</div>");
		sb.append("<div class='tdW noprint'></div>");
		sb.append("</div>");
	},

	ligneTitre : function(sb) {
		sb.append("<div class='acTR2 inverse bold italic'>");
		sb.append("<div class='acTDs1 acTDbrw talc'>Qté<br></div>");
		sb.append("<div class='acTDs1 acTDbrw talc'>Qté<br>Grp</div>");
		sb.append("<div class='acTDs1 acTDbrw'>Produit</div>");
		sb.append("<div class='acTDs1 acTDbrw talc'>Poids</div>");
		sb.append("<div class='acTDs1 acTDbrw talc'>Prix</div>");
		sb.append("<div class='acTDs1 noprint talc'>Alertes</div>");
		sb.append("</div>");
	},

	paquets2 : function(y){
		var x = y.acApPr;
		var pu = y.cv.pu;
		var sb = new StringBuffer();
		var xy = x ? x : y.apPr;
		var conv = new AC.Conv(y.pd, y.cv, xy.cell.reduc);
		var n = x ? x.qte : 0;
		var lp = x ? x.lprix : [];
		if (lp.length > n)
			n = lp.length;
		if (lp.length != 0) {
			var p = 0;
			var m = 0;
			for(var i = 0; i < lp.length; i++){
				var mx = Math.round(lp[i]);
				m += mx;
				p += conv.e2p(mx).res;
			}
			sb.append("" + lp.length + " / " + conv.edp(p) + " / " + conv.ede(m) + "  ");
		} else
			sb.append("<span class='red moyen'>!!PRIX ESTIMÉ!!</span> <i>aucun paquet attribué pour l'instant</i> ");
		if (lp.length != 0)
			for (var i = 0; i < n; i++){
				sb.append("<div class='acLpqPq2'>");
				if (i < lp.length){
					var pq = lp[i];
					var pr = Math.floor(pq);
					sb.append(conv.ede(pr) + " / " +  conv.e2p(pr).ed());
				}
				sb.append("</div>");
			}
		return sb.toString();
	},

	line : function(sb, y, ini, nbr) {
		var qteG = y.apPr && y.apPr.qte ? (y.pd.parDemi ? INT.demi(y.apPr.qte) : y.apPr.qte) : 0;
		var x = y.acApPr;
		var xy = x ? x : y.apPr;
		var xed = new AC.edAcApPr(x, null, y.pd, y.cv, xy.cell.reduc);
		sb.append("<div class='trA" + (nbr % 2) + "' data-index='" + y.pd.prod + "'>");
		
		var bxQ = " bxQ" + (this.RW ? " zbtn " : "2");
		var qsqa = APP.Ctx.authUsr ? "souhaitée</span>" : "attribuée</span>";
		sb.append("<div class='tdA talc6 bxQ" + (this.RW ? " zbtn '>" : "'>")
				+ xed.qteL(this.eltAc.initiales, true) + "</div>");

		sb.append("<div class='tdB talc3'>" + qteG + "</div>");

		sb.append("<div class='tdC width90'>");
		if (!APP.Ctx.authUsr && this.RW)
			sb.append("<div class='acLpqLst action2 noprint'>Attribuer </div>");
		AC.PUed(sb, y.pd, y.cv.pu, xy.cell.reduc);
//		sb.append("<div class='acPuProd detail'>");	
//		sb.append(INT.editE(y.cv.pu) + (y.pd.type != 1 ? "/Kg</div>" : "</div>"));
		
		var ip = ini ? "[" + ini + "] " : "";
		var img = "<img class='acf-pic3 ildetail' src='images/dispo" + (y.cv.dispo ? y.cv.dispo : 0) + ".png'></img>";
		var an = y.pd.suppr ? "<div class='acsIL red'> - ANNULEE - </div>" : "";
		sb.append("<div class='acNomProd bold acNomProd2'>"
				+ img + "<div class='acsILBT'>" + ip + y.pd.nom + an + "</div></div>");
		
		sb.append("<div class='acDetProd ildetail'>");
		sb.append("<div class='acsIL colorRy" + y.pd.rayon + " bold'>&nbsp;" + "ABCFE".charAt(y.pd.rayon) + "&nbsp;</div>");
		sb.append("<span class='acsIL small'> [" + y.pd.prod + "]</span>");
		if (!y.cv.dispo){
			sb.append("<div class='acsIL red'> - NON DISPONIBLE - </div>");
		} else {
			if (y.cv.dispo == 4)
				sb.append("<div class='acsIL red'> - SUPPLEMENT - </div>");
			if (y.pd.parDemi)
				sb.append("<span class='acParDemi'> - Commandable par DEMI</span>");
			if (y.pd.type == 3)
				sb.append("<div class='acsIL'> Vrac</div>");
			if (y.pd.froid)
				sb.append("<div class='acsIL'> Froid</div>");
			if (y.pd.bio)
				sb.append("<div class='acsIL'> -" + y.pd.bio.escapeHTML() + "- </div>");
			var x1 = ["", "Poids brut: ", "Poids moyen: ", "Poids moyen: "][y.pd.type];
			sb.append("<div class='acsIL'>" + x1 + INT.editKg(y.cv.poids) + "</div>");
			if (y.cv.qmax)
				sb.append("<div class='acsIL'>; Alerte à " + y.cv.qmax + "</div>");
			if (y.cv.parite)
				sb.append("<div class='acsIL'>; Commande groupe par x2</div>");	
		}
		sb.append("</div>");

		if (y.pd.type == 2){
			sb.append("<div class='acLpq detail'><div class='acLpqLst'>");
			sb.append(this.paquets2(y));
			sb.append("</div></div>");
		}
				
		sb.append("</div>");

		sb.append("<div class='tdD talc6'>" + xed.poids() + "</div>");

		sb.append("<div class='tdE talc6'>" + xed.prix() + "</div>");

		var s = x ? AC.Flag.printBox(x.flags, this.maskFlag, null, []) : "";
		sb.append("<div class='tdF talc6 noprint'>");
		sb.append(s);
		if (!s && y.cpts.cmdETdch)
			sb.append("<div class='acICG'></div>");
		sb.append("</div>");
		sb.append("</div>");
	},

	displaySynthCD : function(sb, y, m){
		var conv = new AC.edApPr(y.x, m, y.pd, y.cv);
		
		sb.append("<div class='acTR1'>");
		sb.append("<div class='acTDl acTD1l'>Demande / distribution aux alterconsos</div>");
		sb.append("<div class='acTDc'>" + conv.qte() + "</div>");
		sb.append("<div class='acTDc2'>" + conv.prix() + "</div>");
		sb.append("<div class='acTDc2'>" + conv.poids() + "</div>");
		sb.append("</div>");
					
		if (conv.hasLpc()) {
			sb.append("<div class='acTR1'>")
			.append("<div class='acTDl acTD1l'>Déclaration des paquets livrés</div>");
			sb.append("<div class='acTDc'>" + conv.lpqc() + "</div>")
			.append("<div class='acTDc2'>" + conv.lpmc() + "</div>")
			.append("<div class='acTDc2'>" + conv.lppc() + "</div>");
			sb.append("</div>");
		}

		if (y.x.charge) {
			sb.append("<div class='acTR1'>")
				.append("<div class='acTDl acTD1l'>Déclaration de livraison</div>");
			sb.append("<div class='acTDc'>" + conv.qteC() + "</div>");
			sb.append("<div class='acTDc2'>" + conv.prixC() + "</div>")
			.append("<div class='acTDc2'>" + conv.poidsC() + "</div>");
			sb.append("</div>");
		}
		
		if (conv.hasLpd()) {
			sb.append("<div class='acTR1'>")
			.append("<div class='acTDl acTD1l'>Déclaration des paquets reçus</div>");
			sb.append("<div class='acTDc'>" + conv.lpqd() + "</div>")
			.append("<div class='acTDc2'>" + conv.lpmd() + "</div>")
			.append("<div class='acTDc2'>" + conv.lppd() + "</div>");
			sb.append("</div>");
		}
	
		if (y.x.decharge) {
			sb.append("<div class='acTR1'>")
			.append("<div class='acTDl acTD1l'>Déclaration de réception</div>");
			sb.append("<div class='acTDc'>" + conv.qteD() + "</div>")
			.append("<div class='acTDc2'>" + conv.prixD() + "</div>")
			.append("<div class='acTDc2'>" + conv.poidsD() + "</div>");
			sb.append("</div>");
		}

	}

}
AC.declare(AC.Bdc, AC.Screen);

/****************************************************************/
AC.Bdl = function(){}
AC.Bdl._static = {
	voir : 1,
	tp : 0,
	tri : 1,
	froidsec : true,
	
	dvoirC : [{code:0, label:"Voir tous les produits disponibles"},
	         {code:1, label:"Ne voir que les produits commandés"},
	         {code:3, label:"Ne voir que les produits NON disponibles"}],
	
	dvoir : [{code:0, label:"Voir tous les produits disponibles"},
	         {code:1, label:"Ne voir que les produits commandés / livrés / reçus ou suppléments"},
	         {code:2, label:"Ne voir que les produits restant à recevoir"},
	         {code:3, label:"Ne voir que les produits NON disponibles"}],
	         
	dtp : [{code:0, label:"Tous types, prix fixe et au Kg"},
	       {code:1, label:"Ne voir que les produits à prix fixe"},
	       {code:2, label:"Ne voir que les produits pré-emballés (au Kg)"},
	       {code:3, label:"Ne voir que les produits en vrac (au Kg)"}],
	       
    dtri1 : [{code:0, label:"Triés par nom de produit"},
            {code:2, label:"Groupés par rayon, triés par nom de produit"}],
            
    dtri2 : [{code:0, label:"Triés par nom de produit"},
            {code:1, label:"Groupés par producteur, triés par rayon / nom de produit"},
            {code:2, label:"Groupés par rayon, triés par nom de produit"}],
	
    sortPP : function(a, b){
    	var an = a.eltAp.initiales;
    	var bn = b.eltAp.initiales;
    	if (an < bn) return -1;
    	if (an > bn) return 1;
    	// return AC.Bdl.sortP(a, b);    	    	
    	return AC.Bdl.sortR(a, b);    	    	
    },

    sortR : function(a, b){
    	var an = a.pd.rayon ? a.pd.rayon : 9;
    	var bn = b.pd.rayon ? b.pd.rayon : 9;
    	if (an < bn) return -1;
    	if (an > bn) return 1;
    	return AC.Bdl.sortP(a, b);    	
    },

    sortP : function(a, b){
    	var an = a.pd.nom.toUpperCase();
    	var bn = b.pd.nom.toUpperCase();
    	if (an < bn) return -1;
    	if (an > bn) return 1;
    	return 0;
    }
        
}
AC.Bdl._proto = {
	className : "Bdl",
	
	init : function(g, isCmd){
		this.isCmd = isCmd ? true : false;
		this.g = g;
		this.changed = {};
		this.lv = AC.ac2.viewDT.getLv(this.g);
		this.cellGac = this.lv.cellGac;
		this.isGac = APP.Ctx.authType == 1 ? true : false;
		this.cellGap = this.lv.cellGap;
		this.codeLivr = this.lv.slivr.codeLivr;
		return AC.Screen.prototype.init.call(this, AC.ac2.viewDT);
	},
	
	compile : function(){
		this.noComptaAC = !this.isGac && !this.isCmd && AC.ac2.viewDT.optionGacs[this.cellGac.code];
		this.lv = AC.ac2.viewDT.getLv(this.g);
		this.ann = this.lv.livr.suppr || this.lv.slivr.suppr;
		this.phase = this.lv.slivr.livr.phase;
		this.maskFlag = !this.isCmd ? (this.phase < 2 ? AC.DTGac.maskFlagLC : AC.DTGac.maskFlagLD) : 
			(this.phase < 2 ? AC.DTGac.maskFlagC : AC.DTGac.maskFlagD);
		this.dispMode = !this.isCmd ? "lv" : (this.phase < 2 ? "cmd" : "distrib");
		this.contacts = this.isGac ? this.cellGac.getContacts() : [];
		if (this.isGac) {
			var phx = AC.Context.phases[APP.Ctx.cal.getStatut(this.lv.slivr, true)];
			this.RW = phx == 1 || phx == 3 ;
			this.RWLP = phx == 3 ;
		} else {
			this.RW = this.phase > 1 && this.phase < 4;
			this.RWLP = this.RW;
		}
		if (APP.Ctx.authType == 1 && APP.Ctx.authUsr)
			this.headX = this.lv.cellLivrC.getAc(true, APP.Ctx.authUsr);
		else
			this.headX = this.lv.cellLivrC.getGac(true);
	},
	
	paintTitle : function(){
		var sb = new StringBuffer();
		
		sb.append("<div class='barTop'><div class='titreS'>");
		var dl = AC.AMJ.dateLongue(this.lv.slivr.livr.expedition)
		if (this.isCmd) {
			var lb = this.phase > 1 ? "Distribution" : "Commande";
			sb.append("Bon de " + lb + " - Expédition du " + dl);
		} else
			sb.append("Bon de Livraison - Expédition du " + dl);
		if (this.ann)
			sb.append("<span class='redlabel'>***ANNULEE*** </span>");
		sb.append("</div></div>");
		
		sb.append("<div class='tableA'><div class='trA0'>");
		
		sb.append("<div class='tdA' style='width:50%'>");
		var eltGap = this.cellGap.get(1);
		sb.append("<div class='tdAdresse'><div>Groupement Expéditeur : " + eltGap.nom.escapeHTML() + "</div>");
		if (eltGap.localisation){
			sb.append(Util.adresse(eltGap.localisation));
		} else
			sb.append("<div>Localisation non renseignée</div>");
		sb.append("</div></div>");
		
		sb.append("<div class='tdB' style='width:50%'>");
		var eltGac = this.cellGac.get(1);
		sb.append("<div class='tdAdresse'><div>Groupe Destinataire : " + eltGac.nom.escapeHTML() + "</div>");
		sb.append(Util.adresse2(eltGac, this.lv.slivr));
		sb.append("</div></div>");
		
		sb.append("</div></div>");
		return sb.toString();
	},

	paquets1 : function(y){
		var sb = new StringBuffer();
		var lc = this.lv.cellLivrC;
		var ap = y.x.ap;
		var pr = y.x.pr;
		for(var i = 0, e = null; e = this.contacts[i]; i++) {
			var x = lc.getAcApPr(false, e.code, ap, pr)
			if (x && x.status == 2)
				sb.append("<div class='acLpqPq1'>" + (y.pd.parDemi ? INT.demi(x.qte) : x.qte) + "  " + e.initiales + "</div>");
		}
		return sb.toString();
	},

	paquets2c : function(y){
		var pu = y.cv.pu;
		var sb = new StringBuffer();
		
		var id = this.cellGap.code + "_" + y.pd.prod;
		var euro = !AC.ac2.euro[id];
		var conv = new AC.Conv(y.pd, y.cv, this.lv.cellLivrC.reduc);
		
		var n = y.x.qte;
		if (y.x.qteC > n)
			n = y.x.qteC;
		if (y.x.lprixC.length > n)
			n = y.x.lprixC.length;
		if (y.x.qteD > n)
			n = y.x.qteD;
		if (y.x.lprix.length > n)
			n = y.x.lprix.length;
		
		var l1 = []; // lprix seulement
		var l2 = []; // lprixC seulement
		var l3 = []; // les deux
		for(var i = 0; i < y.x.lprix.length; i++){
			var pr = y.x.lprix[i];
			l1.push((pr * 10) + 1);
		}
		for(var i = 0; i < y.x.lprixC.length; i++){
			var pr = Math.floor(y.x.lprixC[i] / 1000);
			var j = -1;
			for(var k = 0; k < l1.length; k++){
				var prj = Math.floor(l1[k] / 10000);
				if (prj == pr) {
					j = k;
					break;
				}
			}
			if (j == -1)
				l2.push((y.x.lprixC[i] * 10) + 2);
			else {
				l1.splice(j, 1);
				l3.push((y.x.lprixC[i] * 10) + 3);
			}
		}
		var lz = [];
		for(var i = 0; i < l1.length; i++) lz.push(l1[i]);
		for(var i = 0; i < l2.length; i++) lz.push(l2[i]);
		for(var i = 0; i < l3.length; i++) lz.push(l3[i]);
		lz.sort(AC.Sort.num);
		if (n < lz.length)
			n = lz.length;
		var qT = [0,0,0];
		var pT = [0,0,0];
		var mT = [0,0,0];
		// var ts = ["Rec", "Liv", "R+L"];
		var ts = ["Dec", "Cha", "C+D"];
		var sb2 = new StringBuffer();
		for(var i = 0; i < n; i++){
			sb2.append("<div class='acLpqPq2'>");
			if (i < lz.length) {
				var m1 = Math.floor(lz[i] / 10);
				var ac = m1 % 1000;
				var aced = !ac ? "" : (this.cellGac.get(ac).initiales);
				var m = Math.floor(lz[i] / 10000);
				var p = conv.e2p(m).res;
				var t = (lz[i] % 10) - 1;
				qT[t] += 1;
				pT[t] += p;
				mT[t] += m;
				var ed = euro ? INT.editE(m) : INT.editKg(p);
				sb2.append(ed + " " + ts[t] + " " + aced);
			} else
				sb2.append("&nbsp");
			sb2.append("</div>");
		}
		var libs = [
			["Dec : <i>Déchargés : </i>", "Dec : <i>Déchargés : </i>", "Dec : <i>Déchargés <b>NON chargés</b> : </i>"],
			["Cha : <i>Chargés : </i>", "Cha : <i>Chargés : </i>", "Cha : <i>Chargés <b>NON déchargés</b> : </i>"],
			["C+D : <i>Chargés et déchargés : </i>", "C+D : <i>Chargés et déchargés : </i>", "C+D : <i>Chargés et déchargés : </i>"]
			];
		var il = y.x.lprix.length ? (y.x.lprixC.length ? 2 : 0) : (y.x.lprixC.length ? 1 : 2);

//		var libT = [
//			"Rec : <i>Déclarés reçus, <b>non déclarés à la livraison</b>: </i> ",
//			"Liv : <i>Déclarés livrés, <b>non trouvés à la réception</b>: </i>",
//			"R+L : <i>Déclarés livrés, a priori acceptés à la réception: </i>"
//			];
		for(var i = 0; i < 3; i++)
			if(qT[i] != 0) {
//				sb.append(libT[i] + qT[i] + " / " + INT.editKg(pT[i]) + " / " 
				sb.append(libs[i][il] + qT[i] + " / " + INT.editKg(pT[i]) + " / " 
						+ INT.editE(mT[i]) + "<br>");
			}
		sb.append(sb2.toString());
		
		sb2.clear();
		var lc = this.lv.cellLivrC;
		var ap = y.x.ap;
		var pr = y.x.pr;
		for(var i = 0, e = null; e = this.contacts[i]; i++) {
			var x = lc.getAcApPr(false, e.code, ap, pr)
			if (x && x.status == 2)
				sb2.append("<div class='acLpqPq1'>" + x.qte + "  " + e.initiales + "</div>");
		}
		var s = sb2.toString();
		if (s){
			sb.append("<br>");
			sb.append(s);
		}
		return sb.toString();
	},

	paquets2p : function(y){
		var pu = y.cv.pu;
		var sb = new StringBuffer();
		
		var id = this.cellGap.code + "_" + y.pd.prod;
		var euro = !AC.ac2.euro[id];
		var conv = new AC.Conv(y.pd, y.cv, y.x.cell.reduc);
		
		var n = y.x.qte;
		if (y.x.qteC > n)
			n = y.x.qteC;
		if (y.x.lprixC.length > n)
			n = y.x.lprixC.length;
		if (y.x.qteD > n)
			n = y.x.qteD;
		if (y.x.lprix.length > n)
			n = y.x.lprix.length;
		
		var l1 = []; // lprix seulement
		var l2 = []; // lprixC seulement
		var l3 = []; // les deux
		for(var i = 0; i < y.x.lprix.length; i++){
			var pr = Math.floor(y.x.lprix[i] / 1000);
			l1.push((pr * 10) + 1);
		}
		for(var i = 0; i < y.x.lprixC.length; i++){
			var pr = Math.floor(y.x.lprixC[i] / 1000);
			var j = l1.indexOf((pr * 10) + 1);
			if (j == -1)
				l2.push((pr * 10) + 2);
			else {
				l1.splice(j, 1);
				l3.push((pr * 10) + 3);
			}
		}
		var lz = [];
		for(var i = 0; i < l1.length; i++) lz.push(l1[i]);
		for(var i = 0; i < l2.length; i++) lz.push(l2[i]);
		for(var i = 0; i < l3.length; i++) lz.push(l3[i]);
		lz.sort(AC.Sort.num);
		if (n < lz.length)
			n = lz.length;
		var qT = [0,0,0];
		var pT = [0,0,0];
		var mT = [0,0,0];
		var ts = ["Dec", "Cha", "C+D"];
		var sb2 = new StringBuffer();
		for(var i = 0; i < n; i++){
			sb2.append("<div class='acLpqPq2'>");
			if (i < lz.length) {
				var m = Math.floor(lz[i] / 10);
				var p = conv.e2p(m).res;
				var t = (lz[i] % 10) - 1;
				qT[t] += 1;
				pT[t] += p;
				mT[t] += m;
				var ed = euro ? INT.editE(m) : INT.editKg(p);
				sb2.append(ed + " " + ts[t]);
			} else
				sb2.append("&nbsp");
			sb2.append("</div>");
		}
		var libs = [
			["Dec : <i>Déchargés :</i>", "Dec : <i>Déchargés :</i>", "Dec : <i>Déchargés <b>NON chargés</b> : </i>"],
			["Cha : <i>Chargés :</i>", "Cha : <i>Chargés :</i>", "Cha : <i>Chargés <b>NON déchargés</b> : </i>"],
			["C+D : <i>Chargés et déchargés :</i>", "C+D : <i>Chargés et déchargés :</i>", "C+D : <i>Chargés et déchargés : </i>"]
			];
		var il = y.x.lprix.length ? (y.x.lprixC.length ? 2 : 0) : (y.x.lprixC.length ? 1 : 2);

//		var libT = [
//			"Rec : <i>Déclarés reçus, <b>non cités à la livraison</b>: </i> ",
//			"Liv : <i>Déclarés livrés, <b>non trouvés à la réception</b>: </i>",
//			"R+L : <i>Déclarés livrés, trouvés à la réception: </i>"
//			];
		for(var i = 0; i < 3; i++)
			if(qT[i] != 0) {
//				sb.append(libT[i] + qT[i] + " / " + INT.editKg(pT[i]) + " / " 
				sb.append(libs[i][il] + qT[i] + " / " + INT.editKg(pT[i]) + " / " 
						+ INT.editE(mT[i]) + "<br>");
			}
		sb.append(sb2.toString());
		return sb.toString();
	},

	paquets3 : function(y){
		var sb = new StringBuffer();
		var lc = this.lv.cellLivrC;
		var ap = y.x.ap;
		var pr = y.x.pr;
		var qt = 0;
		var pt = 0;
		var conv = new AC.Conv(y.pd, y.cv, lc.reduc);
		for(var i = 0, e = null; e = this.contacts[i]; i++) {
			var x = lc.getAcApPr(false, e.code, ap, pr)
			if (x && x.status == 2 && x.qte) {
//				var qx = x.poids_ ? x.qte : conv.p2q(x.poids).res;
				var est = AC.LivrC.aPoidsEstime(x);
				var qx = est ? x.qte : conv.p2q(x.poids).res;
				var pe = conv.edp(x.poids);
//				if (x.poids_)
				if (est)
					pe = "<i>" + pe + "</i>";
				pt += x.poids;
				qt += qx;
				sb.append("<div class='acLpqPq3'>" + conv.edq(qx) + " / " + pe + "  "+ e.initiales + "</div>");
			}
		}
		return "" + conv.edq(qt) + " / " + conv.edp(pt) + "  " + sb.toString();
	},
	
	line : function(sb, y, ini, nbr) {
		var xed = new AC.edApPr(y.x, this.changed[y.pd.prod], y.pd, y.cv);
		sb.append("<div class='trA" + (nbr % 2) + "' data-index='" + y.pd.prod + "'>");
		sb.append("<div class='tdA talc3'>" + xed.qte() + "</div>");
		
		sb.append("<div class='tdB width90'>");
		AC.PUed(sb, y.pd, y.cv.pu, y.x.cell.reduc);
//		sb.append("<div class='acPuProd detail'>");
//		sb.append(INT.editE(y.cv.pu) + (y.pd.type != 1 ? "/Kg</div>" : "</div>"));
		var ip = ini ? "[" + ini + "] " : "";
		var img = !y.cv.dispo || y.cv.dispo == 4 ? 
				"<img class='acf-pic3 ildetail' src='images/dispo" + y.cv.dispo + ".png'></img>" : "";
		var an = y.pd.suppr ? "<div class='acsIL red'> - ANNULEE - </div>" : "";
		var ry = "<div class='acsIL colorRy" + y.pd.rayon + " marg2'>" + "ABCFE".charAt(y.pd.rayon) + "</div>";
		sb.append("<div class='acNomProd bold acNomProd2'>" 
				+ img + "<div class='acsILBT'>" + ip + ry + y.pd.nom + an + "</div></div>");

		sb.append("<div class='acDetProd ildetail'>");
		// sb.append(ry);
		sb.append("<span class='acsIL small'>[" + y.pd.prod + "]</span>");
		if (!y.cv.dispo){
			sb.append("<div class='acsIL red'> - NON DISPONIBLE - </div>");
		} else {
			if (y.cv.dispo == 4)
				sb.append("<div class='acsIL red'> - SUPPLEMENT - </div>");
			if (y.pd.parDemi)
				sb.append("<span class='acParDemi'> - Commandable par DEMI</span>");
			if (y.pd.type == 3)
				sb.append("<div class='acsIL'> Vrac</div>");
			if (y.pd.froid)
				sb.append("<div class='acsIL'> Froid</div>");
			if (y.pd.bio)
				sb.append("<div class='acsIL'> -" + y.pd.bio.escapeHTML() + "- </div>");
			var x1 = ["", "Poids brut: ", "Poids moyen: ", "Poids moyen: "][y.pd.type];
			sb.append("<div class='acsIL'>" + x1 + INT.editKg(y.cv.poids) + "</div>");
			if (y.cv.qmax)
				sb.append("<div class='acsIL'>; Alerte à " + y.cv.qmax + "</div>");
			if (y.cv.parite)
				sb.append("<div class='acsIL'>; Commande groupe par x2</div>");	
		}
		sb.append("</div>");
	
		var pql = "<div class='acLpqLst'>";
		if (y.pd.type == 1){
			if (this.isGac) {
				sb.append("<div class='acLpq detail'>" + pql);
				sb.append(this.paquets1(y));
				sb.append("</div></div>");
			}
		} else if (y.pd.type == 2){
			sb.append("<div class='acLpq detail'><div class='acLpqBEK'></div>" + pql);
			if (this.isGac)
				sb.append(this.paquets2c(y));
			else
				sb.append(this.paquets2p(y));
			sb.append("</div></div>");
		} else {
			if (this.isGac) {
				sb.append("<div class='acLpq detail'>" + pql);
				sb.append(this.paquets3(y));
				sb.append("</div></div>");
			}
		}
			
		sb.append("</div>");

		if (this.dispMode == "lv") {
			if (this.isGac){
				// var nl = !y.x.lprix || y.x.lprix.length == 0;
				var bxQD = " bxQD zbtn" + (this.RW ? "" : "2");
				var bxPD = " bxPD zbtn" + (this.RW ? "" : "2");
				
				var qc2 = "";
				if (y.pd.type == 2 && y.x.lprixC.length != y.x.qteC)
					qc2 = "<div class='italic detail'>" + y.x.lprixC.length + "</div>";
				sb.append("<div class='tdC talc6 bxQC'>" + xed.qteC() + qc2 + "</div>");
				if (y.pd.type != 1) {
					var pc2 = "";
					if (y.pd.type == 2 && y.x.lprixC.length) {
						if (xed.conv.e2p(y.x.lprixTC).res != y.x.poidsC )
							pc2 = "<div class='italic detail'>" + xed.conv.ed() + "</div>";
					}
					sb.append("<div class='tdD talc6 bxPC'>" + xed.poidsC() + pc2 + "</div>");
				} else
					sb.append("<div class='tdD talc6'></div>");
				
				var qd2 = "";
				if (y.pd.type == 2 && y.x.lprix.length != y.x.qteD)
					qd2 = "<div class='italic detail'>" + y.x.lprix.length + "</div>";
				sb.append("<div class='tdE talc6'><div class='acTDcIn" + bxQD + "'>"  
						+ xed.qteD() + qd2 + "</div></div>");
				if (y.pd.type != 1) {
					var pd2 = "";
					if (y.pd.type == 2 && y.x.lprix.length) {
						if (xed.conv.e2p(y.x.lprixT).res != y.x.poidsD )
							pd2 = "<div class='italic detail'>" + xed.conv.ed() + "</div>";
					}
					sb.append("<div class='tdF talc6'><div class='acTDcIn" + bxPD + "'>"
							+ xed.poidsD() + pd2 + "</div></div>");
				} else
					sb.append("<div class='tdF talc6'></div>");
			} else {
				// var nl = !y.x.lprix || y.x.lprix.length == 0;
				var bxQC = " bxQC zbtn" + (this.RW ? "" : "2");
				var bxPC = " bxPC zbtn" + (this.RW ? "" : "2");

				var qc2 = "";
				if (y.pd.type == 2 && y.x.lprixC.length != y.x.qteC)
					qc2 = "<div class='italic detail'>" + y.x.lprixC.length + "</div>";
				sb.append("<div class='tdC talc6'><div class='acTDcIn" + bxQC + "'>" 
						+ xed.qteC() + qc2 + "</div></div>");
				if (y.pd.type != 1) {
					var pc2 = "";
					if (y.pd.type == 2 && y.x.lprixC.length) {
						if (xed.conv.e2p(y.x.lprixTC).res != y.x.poidsC )
							pc2 = "<div class='italic detail'>" + xed.conv.ed() + "</div>";
					}
					sb.append("<div class='tdD talc6'><div class='acTDcIn" + bxPC + "'>"
							+ xed.poidsC() + pc2 + "</div></div>");
				} else
					sb.append("<div class='tdD talc6'></div>");

				var qd2 = "";
				if (y.pd.type == 2 && y.x.lprix.length != y.x.qteD)
					qd2 = "<div class='italic detail'>" + y.x.lprix.length + "</div>";
				sb.append("<div class='tdE talc6 bxQD'>" + xed.qteD() + qd2 + "</div>");
				if (y.pd.type != 1) {
					var pd2 = "";
					if (y.pd.type == 2 && y.x.lprix.length) {
						if (xed.conv.e2p(y.x.lprixT).res != y.x.poidsD )
							pd2 = "<div class='italic detail'>" + xed.conv.ed() + "</div>";
					}
					sb.append("<div class='tdF talc6 bxPD'>" + xed.poidsD() + pd2 + "</div>");
				} else
					sb.append("<div class='tdF talc6 acTDLast'></div>");			
			}
		}

		var s = AC.Flag.printBox(y.x.flags, this.maskFlag, y.cpts, ["chNcmd", "dchNcmd"]);
		sb.append("<div class='tdG talc6 noprint icbtn' data-index='" + y.pd.prod + "'>");
		sb.append(s);
		if (!s && y.actif)
			sb.append("<div class='acICG'></div>");
		sb.append("</div>");
		sb.append("</div>");
	},

	lineSep : function(sb, text, pf, cl, di) {
		sb.append("<div class='acTR2Text'>");
		
		sb.append("<div class='tdW'><div class='tdWT'>");
		var cldi = (cl ? " " + cl + "'" : "'") + (di ? " data-index='" + di + "'" : "");
		sb.append("<div class='acSPl3c" + cldi + ">" + text + "</div>");
		sb.append("</div></div>");
		
		sb.append("<div class='tdW'></div>");
		if (!this.isCmd) {
			sb.append("<div class='tdW'></div>");
			sb.append("<div class='tdW'></div>");
			sb.append("<div class='tdW'></div>");
			sb.append("<div class='tdW'></div>");
		}
		sb.append("<div class='tdW noprint'></div>");
		sb.append("</div>");
	},

	lineTitre : function(sb, text, pf, cl, di) {
		sb.append("<div class='acTR2 inverse bold italic'><div class='acTDs1 acTDbrw talc'>Qte<br>cmd.</div>");
		if (!this.isCmd) {
			sb.append("<div class='acTDs1 acTDbrw'>Produit</div>");
			sb.append("<div class='acTDs1 talc'>Qte</div>");
			sb.append("<div class='acTDs1 acTDbrw'>/ Poids<br>Livrés</div>");
			sb.append("<div class='acTDs1 talc'>Qte</div>");
			sb.append("<div class='acTDs1 acTDbrw'>/ Poids<br>Reçus</div>");
		} else {
			sb.append("<div class='acTDs1 acTDbrw'>Produit<br>Quantités - poids attribués aux alterconsos</div>");			
		}
		sb.append("<div class='acTDs1 noprint talc'>Alertes</div>");
		sb.append("</div>");
	},

	paintContent : function(){
		var sb = new StringBuffer();
		sb.append("<div class='noprint'>");
		
		sb.append("<div class='acCBBlock'><div class='acCBItem' data-ac-id='detail'></div>");
		if (!this.isCmd)
			sb.append("<div class='acCBItem' data-ac-id='froidsec'></div>");
		sb.append("</div>");
		
		sb.append("<div class='acsILB2'><div data-ac-id='voir'></div></div>");
		if (!this.isCmd)
			sb.append("<div class='acsILB2'><div data-ac-id='tp'></div></div>");
		sb.append("<div class='acsILB2'><div data-ac-id='tri'></div></div>");
		sb.append("</div>");
		
		sb.append("<div class='acSpace1'></div>");
		new AC.CptEdit().init(sb, this.headX).all();
		
		sb.append("<div class='noprint'>")
		if (!this.isCmd) 
			var s = AC.Flag.printTable(this.lv.cpts, AC.DTGac.maskCptL, this.lv.flags, 
					(this.lv.phase < 2 ? AC.DTGac.maskFlagLC : AC.DTGac.maskFlagLD));
		else if (this.lv.slivr.phase <= 1)
			var s = AC.Flag.printTable(this.lv.cpts, AC.DTGac.maskCptC, this.lv.flags, AC.DTGac.maskFlagC);
		else
			var s = AC.Flag.printTable(this.lv.cpts, AC.DTGac.maskCptD, this.lv.flags, AC.DTGac.maskFlagD);
		if (s) {
			sb.append("<div class='acSpace1'></div>");
			sb.append(s);
		}
		sb.append("</div>");
		
		sb.append("<div class='acSpace1'></div>");
		
		this.lv.bdl.sort([AC.Bdl.sortP, AC.Bdl.sortPP, AC.Bdl.sortR][AC.Bdl.tri]);

		if (!this.isCmd && AC.Bdl.froidsec){
			sb.append("<div class='barTop2'>Produits froids</div>");
			if (!this.paintContent2(sb, 1)){
				sb.append("<div class='acSpace5'></div>");
				sb.append("<div class='barTop2 dopagebreakbefore'>Produits secs</div>");
			} else {
				sb.append("<div class='italic'>Aucun produit froid ne correspond aux critères de sélection</div>");
				sb.append("<div class='acSpace5'></div>");
				sb.append("<div class='barTop2'>Produits secs</div>");
			}
			if (this.paintContent2(sb, 2))
				sb.append("<div class='italic'>Aucun produit sec ne correspond aux critères de sélection</div>");
		} else {
			if (this.paintContent2(sb, 0))
				sb.append("<div class='italic'>Aucun produit ne correspond aux critères de sélection</div>");
		}
		return sb.toString();
	},
	
	paintContent2 : function(sb, fs){
		var vide = true;
		var av = -1;
		var nbr = 0;
		for(var i = 0, y = null; y = this.lv.bdl[i]; i++){
			if (fs) {
				if (fs == 1 && !y.pd.froid)
					continue;
				if (fs == 2 && y.pd.froid)
					continue;
			}
			
			if (AC.Bdl.tp){
				if (AC.Bdl.tp != y.pd.type)
					continue;
			}
			
			if (AC.Bdl.voir == 0) {
				if (!y.cv.dispo)
					continue;
			} else if (AC.Bdl.voir == 1) {
				var b = y.cv.dispo == 4 || y.x.qte || y.x.decharge || y.x.charge || 
					y.x.qteS || (y.x.lprix && y.x.lprix.length != 0);
				if (!b)
					continue;
			} else if (AC.Bdl.voir == 2) {
				if (!y.cpts.cmdNdch)
					continue;
			} else if (AC.Bdl.voir == 3) {
				if (y.cv.dispo)
					continue;
			}
			
			if (vide) {
				sb.append("<div class='tableA'>");
				this.lineTitre(sb);
				vide = false;
			}
			if (AC.Bdl.tri == 1) {
				if (av != y.eltAp.code){
					this.lineSep(sb, "[" + y.eltAp.initiales + "] " + y.eltAp.nom.escapeHTML(), av == -1,
							"acNomAp", y.eltAp.code);
					av = y.eltAp.code;
				}
			} else if (AC.Bdl.tri == 2) {
				if (av != y.pd.rayon){
					this.lineSep(sb, AC.StepG1.rayons[y.pd.rayon], av == -1);
					av = y.pd.rayon;
				}				
			}
			this.line(sb, y, AC.Bdl.tri != 1 ? y.eltAp.initiales : null, nbr++);
		}
		if (!vide) {
			sb.append("</div>");
		}
		return vide;
	},
	
	undo : function(){
		this.changed = {};
		this.enable();
		this.display();
	},
	
	register : function(){
		var mono = this.lv.cellGap.estMono();
		var _static = AC.Bdl;
		
		new AC.RadioButton(this, "voir", this.dispMode == "cmd" ? _static.dvoirC : _static.dvoir);
		this._voir.val(_static.voir);
		
		if (!this.isCmd) {
			new AC.RadioButton(this, "tp", _static.dtp);
			this._tp.val(_static.tp);
		}
		
		new AC.RadioButton(this, "tri", mono ? _static.dtri1 : _static.dtri2);
		if (mono && _static.tri == 1)
			_static.tri = 0;
		this._tri.val(_static.tri);
		
		this.regDetail();
		
		var self = this;
		if (!this.isCmd) {
			new AC.CheckBox2(this, "froidsec", "Afficher deux listes séparées pour le \"froid\" et le \"sec\"");
			this._froidsec.val(_static.froidsec);
			var self = this;
			this._froidsec.jqCont.off("dataentry").on("dataentry", function(){
				_static.froidsec = self._froidsec.val();
				self.display();
			});
			
			this._tp.jqCont.off("dataentry").on("dataentry", function(){
				_static.tp = self._tp.val();
				self.display();
			});
		}
		
		this._voir.jqCont.off("dataentry").on("dataentry", function(){
			_static.voir = self._voir.val();
			self.display();
		});
		
		this._tri.jqCont.off("dataentry").on("dataentry", function(){
			_static.tri = self._tri.val();
			self.display();
		});
		
		AC.oncl(this, this._content.find(".acNomAp"), function(target){
			var ap = Util.dataIndex(target);
			AC.StackG.show({type:"Ap", gap:this.lv.cellGap.code, ap:ap});
		});
		
		AC.oncl(this, this._content.find(".acNomProd"), function(target){
			var prod = Util.dataIndex(target);
			AC.StackG.show({type:"Pr", gap:this.lv.cellGap.code, ap:Math.floor(prod / 10000), pr:prod % 10000});
		});
		
		AC.oncl(this, this._content.find(".acLpqBEK"), function(target){
			var prod = parseInt(target.parent().parent().parent().attr("data-index"), 10);
			var gap = this.lv.cellGap.code;
			if (AC.ac2.euro[gap + "_" + prod])
				delete AC.ac2.euro[gap + "_" + prod];
			else
				AC.ac2.euro[gap + "_" + prod] = true;
			this.repaintLpq(prod);
		});
		
		AC.oncl(this, this._content.find(".icbtn"), function(target){
			new AC.Info().init(this, target, 1);
		});
		
		if (this.isGac) {
			var bxq = this._content.find(".bxQD");
			AC.oncl(this, bxq, function(target){
				if (this.RW)
					new AC.KBQ().init(this, this.qDChanged, target, "-D");
				else
					this.noChg();
			});
			var bxp = this._content.find(".bxPD");
			AC.oncl(this, bxp, function(target){
				if (this.RW)
					new AC.KBP().init(this, this.pDChanged, target, "-D");
				else
					this.noChg();
			});
		} else {
			var bxq = this._content.find(".bxQC");
			AC.oncl(this, bxq, function(target){
				if (this.RW)
					new AC.KBQ().init(this, this.qCChanged, target, "-C");
				else
					this.noChg();
			});
			var bxp = this._content.find(".bxPC");
			AC.oncl(this, bxp, function(target){
				if (this.RW)
					new AC.KBP().init(this, this.pCChanged, target, "-C");
				else
					this.noChg();					
			});	
		}
		
		
		AC.oncl(this, this._content.find(".acLpqLst"), function(target){
			var prod = Util.dataIndex(target);
			var typePrix = prod % 10;
			if (this.RWLP) {
				if (this.isGac) {
					if (this.noedit(this.enEdition(), typePrix))
						if (typePrix == 2) {
							var prf = AC.KBLPGac2.prefNV ? AC.KBLPGac2nv : AC.KBLPGac2;
							new prf().init(this, this.lstChanged, target);
						} else {
							new AC.KBQP().init(this, this.qpChanged, target);
						}
					else {}
				} else {
					new AC.KBLPGap().init(this, this.lstChanged, target);				
				}
			} else {
				if (typePrix == 2 && this.isGac)
					alert("La liste des paquets n'est accessible qu'entre la date de livraison et celle d'archivage.");
				else
					this.noChg();
			}
		});
		this.enable();
	},

	noedit : function(ed, typePrix){
		if (ed){
			if (typePrix == 2)
				alert("Des quantités et poids ont été saisis et pas encore validés."
						+ "\nLa saisie de nouveaux paquets ou la distribution de paquets existants est bloquée.\n"
						+ "Après fermeture de cette boîte et validation ou annulation de la saisie en cours "
						+ " la saisie des paquets sera à nouveau possible.");
			else
				alert("Des quantités et poids totaux ont été saisis et pas encore validés."
						+ "\nLa modification des attributions aux alterconsos est bloquée.\n"
						+ "Après fermeture de cette boîte et validation ou annulation de la saisie en cours"
						+ " la modification des attributions aux alterconsos sera à nouveau possible.");
			return false;
		}
		return true;
	},

	noChg : function(){
		alert("Saisie non autorisée à cette phase de la commande (ouverture / limite / archivée)");
	},
	
	enable : function(){
		var ed = this.enEdition();
		if (this.RWLP) {
			var lpqLst = this._content.find(".acLpqLst");
			if (ed) {
				lpqLst.removeClass("zbtn");
				lpqLst.addClass("zbtn2");
			} else {
				lpqLst.removeClass("zbtn2");
				lpqLst.addClass("zbtn");			
			}
		}
		Util.btnEnable(this._valider, ed);
		Util.btnEnable(this._annuler, ed);
	},
	
	repaintLpq : function(prod){
		var y = null;
		for(var i = 0; y = this.lv.bdl[i]; i++){
			if (y.pd.prod == prod)
				break;
		}
		if (!y)
			return;
		var x = this._content.find("[data-index='" + prod + "']");
		if (this.isGac)
			var y = this.paquets2c(y, this.lv.cellGap, this.cellGac);
		else
			var y = this.paquets2p(y, this.lv.cellGap, this.cellGac);
		x.find(".tdB").find(".acLpqLst").html(y);
	},

	qpChanged : function(target){
	},

	lstChanged : function(target){
	},
	
	qDChanged : function(target, y, val, raz){
		if (!target)
			return;
		var c = this.changed[y.pd.prod];
		var chg = (y.x.decharge && (val == -1 || val != y.x.qteD)) 
			|| (!y.x.decharge && val != -1)
			|| (y.x.qte != 0 && raz);
		
		if (!chg) {
			if (!c || c.qteD === undefined)
				return;
			if (c) {
				delete c.qteD;
				delete c.razD;
				if (Util.isEmpty(c))
					delete this.changed[y.pd.prod];
			}
		} else {
			if (!c) {
				this.changed[y.pd.prod] = {};
				c = this.changed[y.pd.prod];
			}
			c.razD = val == 0 && raz;
			c.qteD = val;
		}
		if (c.razD)
			target.html("<div class='red acModifie'>RAZ</div>");
		else
			target.html(new AC.edApPr(y.x, c, y.pd, y.cv).qteD());
		this.enable();
	},

	pDChanged : function(target, y, val){
		if (!target)
			return;
		var c = this.changed[y.pd.prod];
		var chg = (y.x.decharge && (val == -1 || y.x.poidsD != val)) || (!y.x.decharge && val != -1);
		if (!chg) {
			if (!c || c.poidsD === undefined)
				return;
			if (c) {
				delete c.poidsD;
				if (Util.isEmpty(c))
					delete this.changed[y.pd.prod];
			}
		} else {
			if (!c) {
				this.changed[y.pd.prod] = {};
				c = this.changed[y.pd.prod];
			}
			c.poidsD = val;
		}
		var xed = new AC.edApPr(y.x, c, y.pd, y.cv);
		target.html(xed.poidsD());
		this.enable();
	},

	qCChanged : function(target, y, val){
		if (!target)
			return;
		var c = this.changed[y.pd.prod];
		var chg = (y.x.charge && (val == -1 || val != y.x.qteC)) 
			|| (!y.x.charge && val != -1)
			|| (y.x.qte != 0);
		
		if (!chg) {
			if (!c || c.qteC === undefined)
				return;
			if (c) {
				delete c.qteC;
				if (Util.isEmpty(c))
					delete this.changed[y.pd.prod];
			}
		} else {
			if (!c) {
				this.changed[y.pd.prod] = {};
				c = this.changed[y.pd.prod];
			}
			c.qteC = val;
		}
		target.html(new AC.edApPr(y.x, c, y.pd, y.cv).qteC());
		this.enable();
	},

	pCChanged : function(target, y, val){
		if (!target)
			return;
		var c = this.changed[y.pd.prod];
		var chg = (y.x.charge && (val == -1 || y.x.poidsC != val)) || (!y.x.charge && val != -1);
		if (!chg) {
			if (!c || c.poidsC === undefined)
				return;
			if (c) {
				delete c.poidsC;
				if (Util.isEmpty(c))
					delete this.changed[y.pd.prod];
			}
		} else {
			if (!c) {
				this.changed[y.pd.prod] = {};
				c = this.changed[y.pd.prod];
			}
			c.poidsC = val;
		}
		var xed = new AC.edApPr(y.x, c, y.pd, y.cv);
		target.html(xed.poidsC());
		this.enable();
	},

	enEdition : function() {
		return !Util.isEmpty(this.changed);
	},

	enErreur : function() {
		return false;
	},

	enregistrer : function(){
		var arg = {op:"42"};
		arg.gap = this.cellGap.code;
		arg.gac = this.cellGac.code;
		arg.codeLivr = this.codeLivr;
		arg.lerprod = [];
		this.razToDo = false;
		for(var prod in this.changed){
			var m = this.changed[prod];
			var x = {prod:parseInt(prod, 10)};
			if (this.isGac) {
				if (m.qteD != undefined) {
					x.qte = m.qteD == -1 ? 999 : m.qteD;
					if (m.razD) {
						x.raz = 1;
						this.razToDo = true;
					}
				}
				if (m.poidsD != undefined)
					x.poids = m.poidsD == -1 ? 999999 : m.poidsD;
			} else {
				if (m.qteC != undefined)
					x.qte = m.qteC == -1 ? 999 : m.qteC;
				if (m.poidsC != undefined)
					x.poids = m.poidsC == -1 ? 999999 : m.poidsC;				
			}
			arg.lerprod.push(x);
		}
		var temp = this.changed;
		this.changed = {};
		arg.operation = "Mise à jour des quantités / poids " + (this.isGac ? "reçus" : "livrés");
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Mise à jour faite");
			if (this.razToDo)
				this.display();
		}, function(data) {
			AC.Message.info("Echec de la mise à jour des quantités / poids " + (this.isGac ? "reçus" : "lvrés"));
			this.changed = temp;
		});
	},
	
	displaySynthCD : function(sb, y, m){
		var edx = new AC.edApPr(y.x, m, y.pd, y.cv);
		
		sb.append("<div class='acTR1'>");
		sb.append("<div class='acTDl acTD1l'>Demande / distribution aux alterconsos</div>");
		sb.append("<div class='acTDc'>" + edx.qte() + "</div>");
		sb.append("<div class='acTDc2'>" + edx.prix() + "</div>");
		sb.append("<div class='acTDc2'>" + edx.poids() + "</div>");
		sb.append("</div>");
					
		if (edx.hasLpc()) {
			sb.append("<div class='acTR1'>")
			.append("<div class='acTDl acTD1l'>Déclaration des paquets livrés</div>");
			sb.append("<div class='acTDc'>" + edx.lpqc() + "</div>")
			.append("<div class='acTDc2'>" + edx.lpmc() + "</div>")
			.append("<div class='acTDc2'>" + edx.lppc() + "</div>");
			sb.append("</div>");
		}

		if (y.x.charge) {
			sb.append("<div class='acTR1'>")
				.append("<div class='acTDl acTD1l'>Déclaration de livraison</div>");
			sb.append("<div class='acTDc'>" + edx.qteC() + "</div>");
			sb.append("<div class='acTDc2'>" + edx.prixC() + "</div>")
			.append("<div class='acTDc2'>" + edx.poidsC() + "</div>");
			sb.append("</div>");
		}
		
		if (edx.hasLpd()) {
			sb.append("<div class='acTR1'>")
			.append("<div class='acTDl acTD1l'>Déclaration des paquets reçus</div>");
			sb.append("<div class='acTDc'>" + edx.lpqd() + "</div>")
			.append("<div class='acTDc2'>" + edx.lpmd() + "</div>")
			.append("<div class='acTDc2'>" + edx.lppd() + "</div>");
			sb.append("</div>");
		}
	
		if (y.x.decharge) {
			sb.append("<div class='acTR1'>")
			.append("<div class='acTDl acTD1l'>Déclaration de réception</div>");
			sb.append("<div class='acTDc'>" + edx.qteD() + "</div>")
			.append("<div class='acTDc2'>" + edx.prixD() + "</div>")
			.append("<div class='acTDc2'>" + edx.poidsD() + "</div>");
			sb.append("</div>");
		}

	}
	
}
AC.declare(AC.Bdl, AC.Screen);

/****************************************************************/
AC.DT2 = function(){}
AC.DT2._static = {}
AC.DT2._proto = {
	className : "DT2",

	init : function(codeLivr){
		this.codeLivr = codeLivr;
		this.gap = APP.Ctx.authGrp;
		APP.Ctx.curLivrs = {};
//		APP.Ctx.curLivrs[this.gap] = this.codeLivr;
		this.livr = APP.Ctx.cal.getLivr(this.gap, this.codeLivr);
		APP.Ctx.curLivrs[this.gap] = this.livr;
		this.date = this.livr.expedition;
		this.allGacs = [];
		this.cellGap = APP.Ctx.loginGrp;
		this.watch(this.cellGap);
		
		this.optionGacsEd = null;
		
		if (this.cellGap.estMono()) {
			this.ap = 1;
			this.fixedAp = 1;
		} else if (APP.Ctx.authUsr) {
			this.ap = APP.Ctx.authUsr;
			this.fixedAp = this.ap;
		} else {
			this.ap = 0;
			this.fixedAp = 0;
		}
		
		this.cellCtlg = AC.Catalogue.getN(this.gap);
		this.watch(this.cellCtlg);
		this.livrP = AC.LivrP.getN(this.gap, "Z", this.codeLivr);
		this.watch(this.livrP);
		this.eltGap = this.cellGap.get(1);
		
		var sb = new StringBuffer();
		if (!APP.Ctx.authUsr) {
			sb.append("<div class='btnBox' id='acBtnBox'>"
				+ "<div id='export' class='action'>Export du catalogue vers Excel</div>"
				+ "<div id='import' class='action'>Import commandes d'un groupe depuis Excel</div></div>");
			sb.append("<div class='acSpace1'></div>");
			sb.append("<div class='ac-space1rem'>" 
					+ "<div class='acdd-box italic' data-ac-id='gacsNC'>"
					+ "Groupes n'effectuant pas la comptabilité des alterconsos :</div>"
					+ "<div data-ac-id='gacsNClist'></div></div>");
			sb.append("<div class='btnBox'>"
					+ "<div id='enregOptionGacs' class='action'>Valider cette liste</div></div>");
			sb.append("<div class='acSpace1'></div>");
		}
		
		sb.append("<div id='fiches'><div class='subSectionT'>Synthèse " 
				+ (this.fixedAp ? "du producteur" : "des producteurs") 
				+ "</div><div class='subSectionB'>");
		
		sb.append("<div id='syntheseAps'></div></div>");

		if (!this.fixedAp) {
			sb.append("<div id='avis1' class='large italic bold orange acSpace2'>Pour restreindre les vues  qui suivent à UN SEUL producteur, "
						+ "cliquer sur sa ligne dans le tableau ci-dessus pour le sélectionner.</div>");
			sb.append("<div id='avisN' class='large italic bold orange acSpace2'>"
						+ "Pour élargir les vues \"tous producteurs confondus\"&nbsp;&nbsp;"
						+ "<div class='action' id='allAps'>cliquer ICI</div></div>");
		}
		sb.append("<div class='acSpace2'></div>");
		if (!this.fixedAp) {
			sb.append("<div class='subSectionT' id='camionsTitre'>Chargement en camion(s) tous producteurs confondus</div>");
		} else {
			sb.append("<div class='subSectionT' id='camionsTitre'>Chargement en camion(s)</div>");
		}
		sb.append("<div id='camions' class='subSectionB'></div></div>");
		AC.ac2._contentDT.html(sb.toString());
		this._content = AC.ac2._contentDT;
					
		if (!APP.Ctx.authUsr) {
			var decor = APP.Ctx.dir.decor(1, null, function(elt){
				return !elt.removed;
			}, true);
			var ag = "<span class='italic'>(Aucun groupement)</span>";
			this.gacsNC = new AC.MultiSelector3(this, "gacsNC", decor, ag);
		}
		
		this._enregOptionGacs = this._content.find("#enregOptionGacs");
		this._enregOptionGacs.addClass("ui-disabled");

		this._syntheseAps = this._content.find("#syntheseAps");
		this._camions = this._content.find("#camions");
		this._camionsTitre = this._content.find("#camionsTitre");
		this._avis1 = this._content.find("#avis1");
		this._avisN = this._content.find("#avisN");
		if (this.ap){
			this._avis1.css("display", "none");
			this._avisN.css("display", "block")
		} else {
			this._avisN.css("display", "none");
			this._avis1.css("display", "block")			
		}
		if (!this.fixedAp)
			AC.oncl(this, this._content.find("#allAps"), function(target){
				if (!this.ap)
					return;
				this._syntheseAps.removeClass("selectedAp");
				this.ap = 0;
				this._avisN.css("display", "none");
				this._avis1.css("display", "block")			
				this._camionsTitre.html("Chargement en camion(s) tous producteurs confondus");
				this.compile();
				this.display();
			});

		AC.DT.prototype.init.call(this);
		return this;
	},
				
	compile : function() {
		this.loading = false;
		this.tauxPrelev = this.cellGap.tauxPrelev(this.date);
		this.phaseMax = 0;
		this.allAps = APP.Ctx.authUsr || this.cellGap.estMono() ? 
				[this.cellGap.get(this.ap)] : this.cellGap.getAllContacts();
		this.date = this.livr.expedition;
		var lstAps = this.cellGap.existAt(this.date);
		this.ctlg = this.cellCtlg.getCtlgLivr(this.codeLivr, this.ap, 0, lstAps);
		if (!this.ap && !this.ctlg["1"])
			this.ctlg["1"] = [];
		this.froids = [];
		this.secs = [];
		for(var ap in this.ctlg) {
			var apd = this.ctlg[ap];
			for (var i = 0, y = null; y = apd[i]; i++)
				if (y.pd.froid)
					this.froids.push(y);
				else
					this.secs.push(y);
		}
		this.sLivrG = {}
		this.sLivr = [];
		this.sLivrC = {}
		for(var g in this.livr.slivrs) {
			var gac = parseInt(g, 10);
			var slivr = this.livr.slivrs[g];
			var x = {gac:gac, slivr:slivr, livr:slivr.livr, eltGac:AC.GAC.elt(gac), cellGap:this.cellGap};
			x.tri = x.eltGac.initiales;
			x.livrC = AC.LivrC.getN(this.gap, this.codeLivr, gac, "X", this.fixedAp ? this.fixedAp : 0);
			x.cellGac = x.livrC.cellGac;
			this.watch(x.cellGac);
			if (x.livrC.version == -1) this.loading = true;
			x.cellLivrC = x.livrC;
			this.watch(x.livrC);
			this.sLivrC[gac] = x.livrC;
			x.phase = x.slivr.phase;
			if (x.phase > this.phaseMax)
				this.phaseMax = x.phase;
			var r = x.livrC.getBdls(0, this.ctlg);
			x.bdl = r.bdl;
			x.cpts = r.cpts;
			x.flags = r.flags;

			this.sLivr.push(x);
			this.sLivrG[gac] = x;
		}
		this.sLivr.sort(AC.Sort.t);
		
		for(var ap in this.ctlg)
			this.livrP.buildApPrT(this.codeLivr, parseInt(ap, 10), this.sLivrC);

		this.cellTweets = AC.Tweets.getN(this.gap, this.codeLivr);
		if (this.cellTweets.version == -1) this.loading = true;
		this.watch(this.cellTweets);
		this.twx = {nbTwb : 0, nbTwr : 0, twr : []};
		var x = this.cellTweets.getNbTweets();
		this.twx.nbTwb += x.black;
		this.twx.nbTwr += x.red;
		if (x.tw)
			this.twx.twr.push(x.tw);
		this.compileCamions();
		this.synthAps = {}
		for(var apx in this.ctlg){
			var ap = parseInt(apx, 10);
			if (this.fixedAp && this.fixedAp != ap)
				continue;
			this.synthAps[ap] = this.compileAp(ap);
		}
		this.synthGap = {poids:0, poidsF:0, poidsS:0, prix:0, prixN:0, 
				nblg:0, prelev:0, suppls:0, avoirs:0};
		for(var apx in this.synthAps){
			var x = this.synthAps[apx];
			for(var f in this.synthGap)
				this.synthGap[f] += x[f];
		}
		
	},

	compileAp : function(ap){
		var r = {taux:this.tauxPrelev[ap], suppls:0, avoirs:0, produits:[]};
		var produits = {};
		for(var g in this.sLivrC){
			var gac = parseInt(g, 10);
			var livrC = this.sLivrC[gac];
			var taux = livrC.fraisgap0 ? 0 : r.taux; // this.tauxPrelev[ap]
			var noComptaAC = this.optionGacs[gac];
			var prods = livrC.getAllApPr2(ap); // [pr] = {x:apPr, pd:prx[apPr.pr]}
			for(var pr in prods) {
				var x = prods[pr];
				if (!produits[pr]) {
					produits[pr] = {pd:x.pd, label:x.pd.nom, type:x.pd.type, froid:x.pd.froid, poidsemb:x.pd.poidsemb};
					AC.LivrC.copyApPr(produits[pr], x.x, noComptaAC, taux);
				} else {
					AC.LivrC.sumApPr(produits[pr], x.x, noComptaAC, taux);
				}
			}			
			var y = livrC.getAp(true, ap);
			if (y.suppl > 0)
				r.suppls += y.suppl;
			if (y.suppl < 0)
				r.avoirs += y.suppl;
		}
		for(var pr in produits) {
			var x = produits[pr];
			x.code = "" + this.cellGap.code + "." + (ap * 10000 + parseInt(pr, 10));
			x.poidsT = x.poidsD;
			x.poidsF = x.froid ? x.poidsT : 0;
			x.poidsS = !x.froid ? x.poidsT : 0;
			x.poidsTB = x.poidsemb ? ((100 + x.poidsemb) * x.poidsT) / 100 : x.poidsT;
			x.poidsFB = x.poidsemb ? ((100 + x.poidsemb) * x.poidsF) / 100 : x.poidsF;
			x.poidsSB = x.poidsemb ? ((100 + x.poidsemb) * x.poidsS) / 100 : x.poidsS;
			r.produits.push(x);
		}
		r.produits.sort(AC.Sort.l);
		r.code = "" + this.cellGap.code + "." + ap;
		r.qteS = 0;
		r.qte = 0;
		r.nblg = 0;
		r.poidsT = 0;
		r.poidsB = 0;
		r.poidsF = 0;
		r.poidsFB = 0;
		r.poidsS = 0;
		r.poidsSB = 0;
		r.prix = 0;
		r.prelev = 0;
		r.prixN = 0;
		r.prixB = 0;
		for(var i = 0, x = null; x = r.produits[i]; i++){
			r.qteS += x.qteS;
			r.qte += r.qte;
			r.nblg += x.nblg;
			r.poidsT += x.poids;
			r.poidsTB += x.poidsTB;
			r.poidsF += x.poidsF;
			r.poidsFB += x.poidsFB;
			r.poidsS += x.poidsS;
			r.poidsSB += x.poidsSB;
			r.prixB += x.prixB;
			r.prelev += x.prelev;
			r.prixN += x.prixN;
		}
		return r;
	},
	
	// new AC.PrintBox2().init(this._printBar, this._page);
	repaintAps : function(sb){
		var sb = new StringBuffer();
		sb.append("<div class='acTB1c acSpace1'>")
		sb.append("<div class='acTR1TC2'>");
		sb.append("<div class='acTDl'>Producteur</div>");
		sb.append("<div class='acTDc2'>Nbr.<br>Lignes</div>");
		sb.append("<div class='acTDc4'>Poids Froid</div>");
		sb.append("<div class='acTDc4'>Poids Sec</div>");
		sb.append("<div class='acTDc4'>Poids Total</div>");
		sb.append("<div class='acTDc4'>Montant<br>Net prod.</div>");
		sb.append("<div class='acTDc2'>Taux<br>prélevé</div>");
		sb.append("<div class='acTDc2 acTDLast'>Suppléments<br>Avoirs</div>");
		sb.append("</div>");
		
		var paire = true;
		if (!this.fixedAp && !this.ap) {
			this.editAp(sb, -1, this.synthGap, paire);
			paire = !paire;
		}
		for(var apx in this.ctlg){
			var ap = parseInt(apx, 10);
			if (this.fixedAp && this.fixedAp != ap)
				continue;
			var x = this.synthAps[ap];
			this.editAp(sb, ap, x, paire);
			paire = !paire;
		}
		sb.append("</div>");
		this._syntheseAps.html(sb.toString());
		var _pb = this._syntheseAps.find("#printBar");
		new AC.PrintBox2().init(_pb, this._syntheseAps);
		AC.oncl(this, this._syntheseAps.find(".voirfiche"), function(target){
			AC.StackG.show({type:"Ap", gap:APP.Ctx.authGrp, ap:Util.dataIndex(target)});	
		});
		if (!this.fixedAp)
			AC.oncl(this, this._syntheseAps.find(".synthAp"), function(target){
				this.selectAp(target);	
			});
	},

	editAp : function(sb, ap, x, paire) {
		var sel = this.fixedAp ? "" : " acSelectable"; 
		var sel2 = ap == this.ap ? " acSelectedAp" : "";
		
		if (ap != -1) {
			var eltAp = this.cellGap.get(ap);
			var url = eltAp.url ? eltAp.url : "images/default-64x64.jpg";
			sb.append("<div class='acTR1TC" + (paire ? "3 " : "4 ") + sel + sel2 + " synthAp' data-index='" + ap + "'>");			
	
			sb.append("<div class='acTDl acsSelectable'>");
			sb.append("<img class='noprint photo2' src='" + url + "'/>");
			sb.append("<div class='noprint right'><div class='action3 inlineblock comptaAp2' data-index='" 
					+ ap + "'>Compta<br>Produits</div>");
			sb.append("<div class='action3 inlineblock comptaAp' data-index='" 
					+ ap + "'>Compta<br>Groupes</div>");
			sb.append("<div class='action3 inlineblock voirfiche' data-index='" 
					+ ap + "'>Voir la fiche</div></div>");
			sb.append("<div class='bold moyen'>" + Util.editEltH(eltAp) + "</div>");
			sb.append("<div class='acEnd'></div>");
			sb.append("</div>");
		} else {
			sb.append("<div class='acTR1TC" + (paire ? "3 " : "4 ") + "'>");
			var d = "Total Groupement : " + AC.AMJ.dateLongue(this.date);
			sb.append("<div class='acTDl'><div class='bold large'>" + d + 
					"<div class='noprint printBar right' id='printBar'></div></div></div>");
		}
		
		sb.append("<div class='acTDc2'>" + (x.nblg ? x.nblg : "&nbsp;") + "</div>");
		
		c = x.poidsF ? INT.editKgA(x.poidsF) : "-";
		sb.append("<div class='acTDc4'>" + c + "</div>");

		c = x.poidsS ? INT.editKgA(x.poidsS) : "-";;
		sb.append("<div class='acTDc4'>" + c + "</div>");

		c = x.poidsT ? INT.editKgA(x.poidsT) : "-";;
		sb.append("<div class='acTDc4'>" + c + "</div>");

		c = INT.editE(x.prixB);
		if (x.prixB != x.prixN)
			c += "<br>" + INT.editE(x.prixN);
		sb.append("<div class='acTDc4'>" + c + "</div>");

		c = ap != -1 && x.taux ? "" + x.taux + "%" : "&nbsp;";
		if (x.prelev)
			c += "<br>" + INT.editE(x.prelev);
		sb.append("<div class='acTDc2'>" + c + "</div>");

		c = x.suppls ? INT.editE(x.suppls) : "&nbsp;";
		if (x.avoirs)
			c += "<br>-" + INT.editE(-x.avoirs);
		sb.append("<div class='acTDc2 acTDLast'>" + c + "</div>");
		sb.append("</div>");
	},
	
	getLv : function(gac){
		return this.sLivrG[gac];
	},

	compileCamions : function(){
		this.camions = []
		this.tournee = APP.Ctx.cal.tournee(this.gap, this.codeLivr);
		this.optionGacs = this.tournee.optionGacs;
		for(var gac in this.sLivrG)
			this.tournee.gac(parseInt(gac, 10));
		var lstCamions = this.tournee.lstCamions();
		for(var i = 0, l = null; l = lstCamions[i]; i++){
			var icam = l.code;
			var x = {label:l.label, lstGacs:this.tournee.getGacs(icam), gacs:{}, 
					apPrTot: [{}, {}], pTot:[0, 0], pTotN:[0, 0]};
			var sg = this.sLivrG;
			x.lstGacs.sort(function(a,b){
				var ai = sg[a].eltGac.initiales;
				var bi = sg[b].eltGac.initiales;
				return ai < bi ? -1 : 1;
			});
			for(var i2 = 0, gac = 0; gac = x.lstGacs[i2]; i2++)
				x.gacs[gac] = [0,0,0,0];
			for(var j = 0; j < 2; j++){
				var prods = j == 0 ? this.froids : this.secs;
				var tot = x.apPrTot[j];
				for (var k = 0, y = null; y = prods[k]; k++) {
					var ap = y.pd.ap;
					if (this.ap && this.ap != ap)
						continue;
					for(var l = 0, sl = null; sl = this.sLivr[l]; l++) {
						var gac = sl.gac;
						if (this.tournee.gac(gac)[j] != icam)
							continue;
						var apPr = sl.livrC.getApPr(false, ap, y.pd.pr);
						if (!apPr)
							continue;
						var noComptaAC = this.optionGacs[gac];
//						if (noComptaAC)
//							var xxx= 1;
						var taux = sl.livrC.fraisgap0 ? 0 : this.tauxPrelev[ap];

						if (!tot[y.pd.prod]){
							tot[y.pd.prod] = {lstPrV:[]};
							AC.LivrC.copyApPr(tot[y.pd.prod], apPr, noComptaAC, taux);
						} else
							AC.LivrC.sumApPr(tot[y.pd.prod], apPr, noComptaAC, taux);
						tot[y.pd.prod].lstPrV.push({initiales:sl.eltGac.initiales, qte:apPr.qte});

						var p = apPr.poidsDX;
						if (y.pd.poidsemb)
							var px = ((100 + y.pd.poidsemb) * p) / 100;
						else
							var px = p;
						if (!sl.slivr.suppr) {
							x.pTot[j] += px;
							x.pTotN[j] += p;
						}
						x.gacs[gac][j] += px;
						x.gacs[gac][j+2] += p;
					}
				}
			}
			this.camions.push(x);
		}
		this.camions.sort(AC.Sort.l);
		this.pTot = [0,0];
		this.pTotN = [0,0];
		for(var i = 0, camion = null; camion = this.camions[i]; i++) {
			this.pTot[0] += camion.pTot[0];
			this.pTot[1] += camion.pTot[1];
			this.pTotN[0] += camion.pTotN[0];
			this.pTotN[1] += camion.pTotN[1];
		}
	},
	
	repaint : function(){
		if (!APP.Ctx.authUsr) {
			var gacs = [];
			for(var g in this.optionGacs)
				gacs.push(parseInt(g, 10));
			this.gacsNC.val(gacs);
			var self = this;
			this.gacsNC.jqCont.off("datentry").on("dataentry", null, function(event){
				event.stopPropagation();
				var x = self.gacsNC.val();
				self.optionGacsEd = x == null ? [] : x;
				self._enregOptionGacs.removeClass("ui-disabled");
			});
		}
		this.repaintAps();
		this.repaintCamions();
	},
		
	selectAp : function(target){
		if (target.hasClass("acSelectedAp")){
			target.removeClass("acSelectedAp");
			this.ap = 0;
			this._avisN.css("display", "none");
			this._avis1.css("display", "block")
			this._camionsTitre.html("Chargement en camion(s) tous producteurs confondus")
			this.compile();
			this.display();
		} else {
			var ap = Util.dataIndex(target);
			if (ap != this.ap) {
				target.addClass("acSelectedAp");
				this.ap = ap;
				this._avis1.css("display", "none");
				this._avisN.css("display", "block")
				this.eltAp = this.cellGap.get(ap);
				this._camionsTitre.html("Chargement en camion(s) pour le producteur "
						+ "<span class='italic large'>" + Util.editEltH(this.eltAp).escapeHTML() + "</span>");
				this.compile();
				this.display();
			}
		}
	},
	
	repaintCamions : function(sb){
		if (this.fixedAp){
			this.eltAp = this.cellGap.get(this.fixedAp);
			this._camionsTitre.html("Chargement en camion(s) pour le producteur "
					+ "<span class='italic large'>" + Util.editEltH(this.eltAp).escapeHTML() + "</span>");
		}
		var sb = new StringBuffer();
		
		sb.append("<div>");
		if (!APP.Ctx.authUsr)
			sb.append("<div class='action ajouter'>Ajouter un camion</div>");
		if (this.camions.length > 1)
			sb.append("<div class='action chargementTotal'>&nbsp;"
					+ "Etat de chargement TOTAL</div>");
		sb.append("</div><div class='acSpace1'></div>");

		var tb = new AC.Table(7, true, false);
		tb.clazz("inverse bold").row("Camion<br>&nbsp;&nbsp;Groupe", "Poids Froid", "Poids Sec", 
				"Poids Total", "Produits<br>Supplt.", "Chèques<br>Avoirs", 
				"Paniers<br>retirés", "DB / CR");
		tb.space();
		
		for(var i = 0, camion = null; camion = this.camions[i]; i++) {
			// {label:camion.nom, lstGacs:camion.gacs, gacs:{}, apPrTot: [{}, {}], pTot:[0, 0], pTotN:[0, 0]}
			var c0 = "";
			if (!APP.Ctx.authUsr)
				var c0 = "<div class='action2 renommer' data-camion='" 
					+ camion.label + "'>Renommer</div>";
			c0 += "<div class='italic bold large'>" + camion.label.escapeHTML() + "</div>";
			if (!APP.Ctx.authUsr && camion.lstGacs.length == 0)
				c0 += "<div class='action2 supprimer' data-camion='" 
				+ camion.label + "'>Supprimer</div>";
			if (camion.lstGacs.length != 0)
				c0 += "<div class='acRetrait2'><div class='action chargement' data-camion='" 
					+ camion.label + "'>Etat de chargement du camion</div></div>";
			var c1 = INT.editKgA(camion.pTotN[0]);
			var c2 = INT.editKgA(camion.pTotN[1]);
			var c2c = INT.editKgA(camion.pTotN[0] + camion.pTotN[1]);
			tb.clazz("inverse").row(c0, c1, c2, c2c);
			for(var j = 0, gac = 0; gac = camion.lstGacs[j]; j++) {
				var noComptaAC = this.optionGacs[gac];
				var sLivr = this.sLivrG[gac];
				var isSuppr = sLivr.slivr.suppr ? true : false;
				// {gac:gac, slivr:slivr, eltGac:AC.GAC.elt(gac), livrC, phase}
				if (!this.ap)
					var x = sLivr.livrC.getGac(true);
				else
					var x = sLivr.livrC.getAp(true, this.ap);
				
				var c0 = new StringBuffer();
				c0.append("<div class='bold moyen'>" + Util.editEltH(sLivr.eltGac) 
					+ (isSuppr ? "<span class='red'> - ANNULEE</span>" : "") + "</div>");
				c0.append("<div class='acRetrait2'>")
				if (!APP.Ctx.authUsr && this.camions.length > 1)
					c0.append("<div class='action3 inlineblock changer' data-index='" 
						+ gac + "'>Camion</div>");
				if (!APP.Ctx.authUsr)
					c0.append("<div class='action3 inlineblock export' data-index='" 
						+ gac + "'>Excel</div>");
				c0.append("<div class='action3 inlineblock bondelivr' data-index='" 
					+ gac + "'>Bon de livraison</div>");
				c0.append("<div class='action3 inlineblock comptagroupe' data-index='" 
					+ gac + "'>Comptabilité</div>");
				c0.append("<div class='action3 inlineblock voirfichegac' data-index='" 
						+ gac + "'>Voir Fiche</div>");
				c0.append("</div>")
				
				var cg = camion.gacs[gac];
				var c1 = INT.editKgA(cg[2]);
				var c2 = INT.editKgA(cg[3]);
				if (isSuppr && cg[0])
					c1 = "<span class='red'>0Kg </span>(" + c1 + ")";
				if (isSuppr && cg[1])
					c2 = "<span class='red'>0Kg </span>(" + c2 + ")"
				var c2c = x.poidsD ? INT.editKgA(x.poidsD) : "&nbsp;";
				var c3 = x.prixD ? INT.editE(x.prixD) : "&nbsp;";
				var c4 = "&nbsp;";
				var c5 = "&nbsp;";
				var c6 = "&nbsp;";

				if (!noComptaAC) {
					if (x.suppl > 0)
						c3 += "<br>" + INT.editE(x.suppl);
					var c4 = x.cheque ? INT.editE(x.cheque) : "&nbsp;";
					if (x.suppl < 0)
						c4 += "<br>" + INT.editE(-x.suppl);
					if (x.suppl < 0)
						c4 += "<br>" + INT.editE(-x.suppl);
					var rf = x.regltFait ? x.regltFait : 0;
					var ra = x.panierAtt ? x.panierAtt : 0;
					var rt = rf + ra;
					var c5 = !rt ? "" : "" + rf + " sur " + rt;
					if (x.db)
						var c6 = "<b>" + INT.editE(x.db) + " DB</b>";
					if (x.cr)
						var c6 = "<b>" + INT.editE(x.cr) + " CR</b>";
				}
				
				tb.row(c0.toString(), c1, c2, c2c, c3, c4, c5, c6);
			}
			tb.space();
		}
		sb.append(tb.flush());
		this._camions.html(sb.toString());
		AC.oncl(this, this._enregOptionGacs, function(target){
			this.enregOptionGacs();	
		});
		AC.oncl(this, this._content.find(".voirfichegac"), function(target){
			AC.StackG.show({type:"Gac", gac:Util.dataIndex(target)});	
		});
		AC.oncl(this, this._content.find(".ajouter"), function(target){
			new AC.AjouterCamion().init(this);
		});
		AC.oncl(this, this._content.find(".renommer"), function(target){
			new AC.RenommerCamion().init(this, target);
		});
		AC.oncl(this, this._content.find(".supprimer"), function(target){
			this.supprCamion(target);
		});
		AC.oncl(this, this._content.find(".changer"), function(target){
			new AC.ChangerCamion().init(this, target);
		});
		AC.oncl(this, this._content.find(".bondelivr"), function(target){
			var gac = Util.dataIndex(target);
			new AC.Bdl().init(gac, false);
		});
		AC.oncl(this, this._content.find(".comptagroupe"), function(target){
			var gac = Util.dataIndex(target);
			new AC.EcGap(this.sLivrC[gac], this.ap, this.optionGacs[gac]);
		});
		AC.oncl(this, this._content.find(".comptaAp"), function(target){
			var ap = Util.dataIndex(target);
			new AC.EcAp(this.livrP, this.cellGap, this.livr, this.sLivr, ap);
		});
		AC.oncl(this, this._content.find(".comptaAp2"), function(target){
			var ap = Util.dataIndex(target);
			new AC.EcAp2(this.cellGap, this.livr, this.sLivr, ap);
		});
		AC.oncl(this, this._content.find(".chargement"), function(target){
			var camion = target.attr("data-camion");
			new AC.ChgCa().init(camion);
		});
		AC.oncl(this, this._content.find(".chargementTotal"), function(target){
			new AC.ChgCa().init(0);
		});
		AC.oncl(this, this._content.find(".export"), function(target){
			var gac = Util.dataIndex(target);
			this.action_exportGac(gac);
		});
		AC.oncl(this, AC.ac2._contentDT.find("#acBtnBox").find(".action"), function(target){
			var a = "action_" + target.attr("id");
			if (this[a])
				this[a]();
		});

	},
	
	action_export : function(){
		new AC.ExportXLS(this.date, this.eltGap.initiales);
	},

	action_import : function() {
		new AC.FormXLS(this.date, true);
	},
		
	action_exportGac : function(gac){
		var i1 = this.eltGap.initiales;
		var i2 = AC.GAC.elt(gac).initiales;
		AC.Req.submitForm("53", "alterconsos/export/AC_" + this.date + "_" + i1
			+ "_" + i2 + ".xls", this.date, 0, gac);
	},
	
	enregOptionGacs : function(){
		this.tournee.optionGacs = {};
		if (this.optionGacsEd != null) 
			for (var i = 0, g = 9999; g = this.optionGacsEd[i]; i++)
				this.tournee.optionGacs[g] = 1;
		var arg = {op:"60"};
		arg.gap = this.gap;
		arg.codeLivr = this.codeLivr;
		arg.jsonData = this.tournee.json();
		arg.operation = "Validation de la liste des groupes sans compabilité des alterconsos";
		AC.Req.post(this, "alterconsos", arg, function(){
			AC.Message.info("Validation faite.");
			this.optionGacsEd = null;
			this._enregOptionGacs.addClass("ui-disabled")
		}, "Echec de l'enregistrement : " );		
	},

	supprCamion : function(target){
		this.ca = target.attr("data-camion");
		var nb = this.tournee.supprCamion(this.ca);
		if (nb == -1) {
			AC.Message.error("Camion " + this.ca + " inconnu.");
			return;
		}
		if (nb) {
			AC.Message.error("Le camion " + this.ca + " achemine encore " + nb + "groupe"
					+ (nb > 1 ? "s" : "") + ". Suppression impossible.");
			return;
		}
		var arg = {op:"60"};
		arg.gap = this.gap;
		arg.codeLivr = this.codeLivr;
		arg.jsonData = this.tournee.json();
		arg.operation = "Suppression d'un camion";
		AC.Req.post(this, "alterconsos", arg, function(){
			AC.Message.info("Suppression faite.");
		}, "Echec de l'enregistrement : " );
	}

}
AC.declare(AC.DT2, AC.DT);

/****************************************************************/

AC.ChgCa = function(){}
AC.ChgCa._static = {
	froidsec : true,
}
AC.ChgCa._proto = {
	className : "ChgCa",
	
	init : function(camion){
		this.camion = camion;
		AC.Screen.prototype.init.call(this);
		this._valider.css("display", "none");
		this._annuler.css("display", "none");
		return this;
	},
	
	compile : function(){
		dt = AC.ac2.viewDT;
		this.codeLivr = dt.codeLivr;
		this.livr = dt.livr;
		this.date = this.livr.expedition;
		this.cellGap = dt.cellGap;
		this.eltGap = dt.eltGap;
		this.ctlg = dt.ctlg;
		this.ap = dt.ap;
		this.tournee = dt.tournee;
		this.icamion = this.camion ? this.tournee.iCamionDeNom(this.camion) : -1;
		if (this.ap)
			this.eltAp = this.cellGap.get(this.ap);
		this.allAps = this.ap ? [this.eltAp] : dt.allAps;

		this.sLivrC = dt.sLivrC;
		this.eltGacs = [];
		if (this.camion){
			var gacs = this.tournee.getGacs(this.icamion);
			for(var j = 0, x = null; x = gacs[j]; j++)
				this.eltGacs.push(AC.GAC.elt(x));
			var jcamion = 0;
			for(var jj = 0, xx = null; xx = dt.camions[jj]; jj++){
				if (xx.label == this.camion) {
					jcamion = jj;
					break;
				}
			}
			this.pTot = dt.camions[jcamion].pTot;
			this.pTotN = dt.camions[jcamion].pTotN;
		} else {
			for(var x in dt.sLivrC)
				this.eltGacs.push(AC.GAC.elt(parseInt(x, 10)));
			this.pTot = dt.pTot;
			this.pTotN = dt.pTotN;
		}
		this.eltGacs.sort(AC.Sort.l);
		
		this.ctlg = [];
		this.ctlg2 = [];
		this.froids = [];
		this.secs = [];
		for(var apx in dt.ctlg) {
			ap = parseInt(apx, 10);
			if (this.ap && ap != this.ap)
				continue;
			var apd = dt.ctlg[ap];
			for (var i = 0, y = null; y = apd[i]; i++) {
				if (this.constructor.froidsec) {
					if (y.pd.froid) {
						if (!this.froids[ap])
							this.froids[ap] = []
						this.froids[ap].push(y);
					} else {
						if (!this.secs[ap])
							this.secs[ap] = []
						this.secs[ap].push(y);
					}
				} else {
					if (!this.ctlg[ap])
						this.ctlg[ap] = [];
					this.ctlg[ap].push(y);
				}
				if (!this.ctlg2[ap])
					this.ctlg2[ap] = [];
				this.ctlg2[ap].push(y);
			}
		}
		this.single = this.tournee.isSingle() || this.camion;
	},

	paintTitle : function(){
		var sb = new StringBuffer();
		var dl = AC.AMJ.dateLongue(this.date)
		var lb = this.single ? ("du camion" + (this.camion ? " \"" + this.camion + "\"" : "")) : "des camions";

		sb.append("<div class='tableA'><div class='trA0'>");
		
		sb.append("<div class='tdA' style='width:50%'>");
		sb.append("<div class='tdAdresse'><div>Bon de chargement " + lb + "<br>Expédition du " + dl + "</div>");
		sb.append("</div></div>");
		sb.append("<div class='tdB' style='width:50%'>");
		sb.append("<div class='tdAdresse'><div>Groupement Expéditeur : " + this.eltGap.nom.escapeHTML() + "</div>");
		if (!this.cellGap.estMono()) {
			if (this.ap)
				sb.append("<div class='bold'>Producteur : " + this.eltAp.nom.escapeHTML() + "</div>");
			else
				sb.append("<div class='bold'>Tous producteurs</div>");
		}
		sb.append("</div></div>");
		
		sb.append("</div></div>");
		return sb.toString();
	},
	
	paintContent : function(){
		var sb = new StringBuffer();
		sb.append("<div class='noprint'>");
		sb.append("<div class='acSpace1' data-ac-id='detail'></div>");
		sb.append("<div class='acSpace1' data-ac-id='froidsec'></div>");
		sb.append("</div>");
		
		if (this.constructor.froidsec){
			sb.append("<div class='barTop2'>Produits froids : ");
			sb.append(INT.editKgA(this.pTotN[0]) + "</div>");
			if (!this.paintContent2(sb, this.froids)){
				sb.append("<div class='barTop2 dopagebreakbefore'>Produits secs : ");
				sb.append(INT.editKgA(this.pTotN[1]) + "</div>");
			} else {
				sb.append("<div class='italic'>Aucun produit ne correspond aux critères de sélection</div>");
				sb.append("<div class='barTop2 acSpace2'>Produits secs : ");
				sb.append(INT.editKgA(this.pTotN[1]) + "</div>");
			}
			if (this.paintContent2(sb, this.secs))
				sb.append("<div class='italic'>Aucun produit ne correspond aux critères de sélection</div>");
		} else {
			sb.append("<div class='barTop2'>Produits froids : ");
			sb.append(INT.editKgA(this.pTotN[0]) + " / Produits secs : ");
			sb.append(INT.editKgA(this.pTotN[1]) + "</div>");
			if (this.paintContent2(sb, this.ctlg))
				sb.append("<div class='italic'>Aucun produit ne correspond aux critères de sélection</div>");
		}
		
		for(var k = 0, eltGac = null; eltGac = this.eltGacs[k]; k++) {
			this.paintContent3(sb, this.ctlg2, eltGac);
		}
		
		return sb.toString();
	},

	register : function(){
		this.regDetail();
		new AC.CheckBox2(this, "froidsec", "Afficher deux listes séparées pour le \"froid\" et le \"sec\"");
		this._froidsec.val(this.constructor.froidsec);
		var self = this;
		this._froidsec.jqCont.off("dataentry").on("dataentry", function(){
			self.constructor.froidsec = self._froidsec.val();
			self.display();
		});
		
		AC.oncl(this, this._content.find(".acNomAp"), function(target){
			var ap = Util.dataIndex(target);
			AC.StackG.show({type:"Ap", gap:this.lv.cellGap.code, ap:ap});
		});

		AC.oncl(this, this._content.find(".acNomProd"), function(target){
			var prod = Util.dataIndex(target);
			AC.StackG.show({type:"Pr", gap:this.lv.cellGap.code, ap:Math.floor(prod / 10000), pr:prod % 10000});
		});
		
	},

	paintContent2 : function(sb, ctlg){
		var vide = true;
		for(var i = 0, eltAp = null; eltAp = this.allAps[i]; i++){
			var ap = eltAp.code;
			var apVide = true;
			var pcAp = 0;
			var pAp = 0;
			var mAp = 0;
			var prodxs = ctlg[ap];
			if (!prodxs || prodxs.length == 0)
				continue;
			var prods = [];
			for(var xi = 0, xx = null; xx = prodxs[xi]; xi++)
				prods.push({nom:xx.pd.nom, cv:xx.cv, pd:xx.pd});
			prods.sort(AC.Sort.n);
			var sj = new StringBuffer();
			var nblin = 0;
			for(var j = 0, y = null; y = prods[j]; j++){
				var isRed = false;
				var froid = y.pd.froid;
				var pcTot = 0;
				var pTot = 0;
				var qTot = 0;
				var mTot = 0;
				var qcTot = 0;
				var sk = new StringBuffer();
				sk.append("<div class='acLpqLst detail'>");
				for(var k = 0, eltGac = null; eltGac = this.eltGacs[k]; k++) {
					var gac = eltGac.code;
					var cm = this.tournee.gac(gac);
					var mcf = this.icamion == -1 || this.icamion == cm[0];
					var mcs = this.icamion == -1 || this.icamion == cm[1];
					if ((froid && !mcf) || (!froid && !mcs))
						continue;
					var livrC = this.sLivrC[gac];
					var apPr = livrC.getApPr(false, ap, y.pd.pr);
					if (!apPr)
						continue;
					var p = apPr.poidsC;
					var pc = ((100 + y.pd.poidsemb) * p) / 100;
					var qc = apPr.qteCX;
					pcTot += pc;
					qcTot += qc;
					qTot += apPr.qte;
					pTot += apPr.poids;
					mTot += apPr.prix;
					var qx = " ";
					if (qc != apPr.qte){
						qx = "/" + (y.pd.parDemi ? INT.demi(qc) : qc) + " ";
						isRed = true;
					}
					sk.append("<div class='acLpqPq1'>" + 
						(y.pd.parDemi ? INT.demi(apPr.qte) : apPr.qte) + qx + eltGac.initiales + "</div>");
				}
				sk.append("</div>");
				if (pcTot || qTot || qcTot || y.cv.dispo == 4) {
					pcAp += pcTot;
					pAp += pTot;
					mAp += mTot;
					apVide = false;
					var cl = "nlin_" + (nblin++ % 2);
					sj.append("<div class='acTR1 " + cl + "' data-index='" + y.pd.prod + "'>");
					sj.append("<div class='acTDc ncol_0'>" + (y.pd.parDemi ? INT.demi(qTot) : qTot) + "</div>");
					sj.append("<div class='acTDc2 ncol_1'>" + INT.editKg(pTot) + "</div>");
					sj.append("<div class='acTDc2 ncol_0'>" + INT.editE(mTot) + "</div>");
					sj.append("<div class='acTDl ncol_1'>");
					AC.PUed(sj, y.pd, y.cv.pu, 0);
//					sj.append("<div class='acPuProd detail'>");
//					sj.append(INT.editE(y.cv.pu) + (y.pd.type != 1 ? "/Kg</div>" : "</div>"));
					var an = y.pd.suppr ? "<div class='acsIL red'> - ANNULEE - </div>" : "";
					var img = y.cv.dispo == 4 ? "<img class='acf-pic3 ildetail' src='images/dispo4.png'></img>" : "";
					sj.append("<div class='acNomProd bold acNomProd2'>" 
							+ "<div class='acsILBT'>" + img + y.pd.nom + an + "</div></div>");
					sj.append(sk.toString());
					sj.append("</div>")
					sj.append("<div class='acTDc " + (isRed ? "red bold" : "") +
							" ncol_0'>" + (y.pd.parDemi ? INT.demi(qcTot) : qcTot) + "</div>");
					sj.append("<div class='acTDc2 ncol_1 acTDLast'>" + INT.editKg(pcTot) + "</div>");
					sj.append("</div>");
				}
			}
			if (!apVide){
				if (vide) {
					sb.append("<div class='acTB2'>");
					this.ligneTitre(sb);
					vide = false;
				}
				this.space(sb);
				sb.append("<div class='acTR1 chgcaAP' data-index='" + ap + "'>");
				sb.append("<div class='acTDc'>&nbsp;</div>");
				sb.append("<div class='acTDc2'>" + INT.editKg(pAp) + "</div>");
				sb.append("<div class='acTDc2'>" + INT.editE(mAp) + "</div>");
				sb.append("<div class='acTDl'>");
				sb.append("<div class='acNomAp'>" + Util.editEltH(eltAp) + "</div></div>");
				sb.append("<div class='acTDc'>&nbsp;</div>");
				sb.append("<div class='acTDc2 acTDLast'>" + INT.editKg(pcAp) + "</div>");
				sb.append("</div>");
				sb.append(sj.toString());
			}
		}
		if (!vide) {
			this.space(sb);
			sb.append("</div>");
		}
		return vide;
	},

	space : function(sb) {
		sb.append("<div class='acTR2'>");
		var td = "<div class='acTDs'>&nbsp;</div>";
		sb.append(td);
		sb.append(td);
		sb.append(td);
		sb.append(td);
		sb.append(td);
		sb.append(td);
		sb.append("</div>");
	},
	
	paintContent3 : function(sb, ctlg, eltGac){
		sb.append("<div class='detail dopagebreakbefore'>");
		sb.append("<div class='acSpace2 titreGac'>" + Util.editEltH(eltGac) + "</div>");
		var vide = true;
		var gac = eltGac.code;
		var cm = this.tournee.gac(gac);
		var livrC = this.sLivrC[gac];
		var mcf = this.icamion == -1 || this.icamion == cm[0];
		var mcs = this.icamion == -1 || this.icamion == cm[1];
		var nblin = 0;
		for(var i = 0, eltAp = null; eltAp = this.allAps[i]; i++){
			var ap = eltAp.code;
			var apVide = true;
			var pcAp = 0;
			var pAp = 0;
			var mAp = 0;
			var prodxs = ctlg[ap];
			if (!prodxs || prodxs.length == 0)
				continue;
			var prods = [];
			for(var xi = 0, xx = null; xx = prodxs[xi]; xi++)
				prods.push({nom:xx.pd.nom, cv:xx.cv, pd:xx.pd});
			prods.sort(AC.Sort.n);
			var sj = new StringBuffer();
			for(var j = 0, y = null; y = prods[j]; j++){
				var froid = y.pd.froid;
				if ((froid && !mcf) || (!froid && !mcs))
					continue;
				var apPr = livrC.getApPr(false, ap, y.pd.pr);
				if (!apPr)
					continue;
				var p = apPr.poidsC;
				var pcTot = ((100 + y.pd.poidsemb) * p) / 100;
				var qcTot = apPr.qteC;

				var pTot = apPr.poids;
				var qTot = apPr.qte;
				var mTot = apPr.prix;
				if (pcTot || qTot || qcTot || y.cv.dispo == 4) {
					pcAp += pcTot;
					pAp += pTot;
					mAp += mTot;
					apVide = false;
					var cl = "nlin_" + (nblin++ % 2);
					sj.append("<div class='acTR1 " + cl + "' data-index='" + y.pd.prod + "'>");
					sj.append("<div class='acTDc ncol_0'>" + (y.pd.parDemi ? INT.demi(qTot) : qTot) + "</div>");
					sj.append("<div class='acTDc2 ncol_1'>" + INT.editKg(pTot) + "</div>");
					sj.append("<div class='acTDc2 ncol_0'>" + INT.editE(mTot) + "</div>");
					sj.append("<div class='acTDl ncol_1'>");
					AC.PUed(sj, y.pd, y.cv.pu, livrC.reduc);
//					sj.append("<div class='acPuProd detail'>");
//					sj.append(INT.editE(y.cv.pu) + (y.pd.type != 1 ? "/Kg</div>" : "</div>"));
					var an = y.pd.suppr ? "<div class='acsIL red'> - ANNULEE - </div>" : "";
					var img = y.cv.dispo == 4 ? "<img class='acf-pic3 ildetail' src='images/dispo4.png'></img>" : "";
					sj.append("<div class='acNomProd bold acNomProd2'><div class='acsILBT'>" + img + y.pd.nom + an + "</div></div>");
					sj.append("</div>")
					sj.append("<div class='acTDc ncol_0'>" + (y.pd.parDemi ? INT.demi(qcTot) : qcTot) + "</div>");
					sj.append("<div class='acTDc2 ncol_1 acTDLast'>" + INT.editKg(pcTot) + "</div>");
					sj.append("</div>");
				}
			}
			if (!apVide){
				if (vide) {
					sb.append("<div class='acTB2'>");
					this.ligneTitre(sb);
					vide = false;
				}
				this.space(sb);
				sb.append("<div class='acTR1 chgcaAP' data-index='" + ap + "'>");
				sb.append("<div class='acTDc'>&nbsp;</div>");
				sb.append("<div class='acTDc2'>" + INT.editKg(pAp) + "</div>");
				sb.append("<div class='acTDc2'>" + INT.editE(mAp) + "</div>");
				sb.append("<div class='acTDl'>");
				sb.append("<div class='acNomAp'>" +  Util.editEltH(eltAp) + "</div></div>");
				sb.append("<div class='acTDc'>&nbsp;</div>");
				sb.append("<div class='acTDc2 acTDLast'>" + INT.editKg(pcAp) + "</div>");
				sb.append("</div>");
				sb.append(sj.toString());
			}
		}
		sb.append("<div class='acTR2'>");
		var td = "<div class='acTDs'>&nbsp;</div>";
		sb.append(td);
		sb.append(td);
		sb.append(td);
		sb.append(vide ? "<div class='acTDs italic bold'>(Aucun produit)</div>" : td);
		sb.append(td);
		sb.append(td);
		sb.append("</div>");
		sb.append("</div>");
		sb.append("</div>");
		return vide;
	},

	ligneTitre : function(sb) {
		sb.append("<div class='acTR2 inverse bold italic'>");
		sb.append("<div class='acTDs1 talc'>Qté</div>");
		sb.append("<div class='acTDs1 talc'>/ Poids</div>");
		sb.append("<div class='acTDs1 acTDbrw'>/ Montant<br>commandés</div>");
		sb.append("<div class='acTDs1 acTDbrw'>Producteur<br>Produit</div>");
		sb.append("<div class='acTDs1 talc'>Qté</div>");
		sb.append("<div class='acTDs1 acTDLast'>/ Poids<br>livrés</div>");
		sb.append("</div>");
	}

}
AC.declare(AC.ChgCa, AC.Screen);

/****************************************************************/

AC.AjouterCamion = function(){}
AC.AjouterCamion._static = {}
AC.AjouterCamion._proto = {
	className : "AjouterCamion",
	
	init : function(caller){
		this.caller = caller;
		this.tournee = this.caller.tournee;
		var sb = new StringBuffer();
		sb.append("<div class='acSpace2'></div>"
				+ "<div class='acLabel'>Nom du camion : </div>"
				+ "<div class='acEntry'><input id='nom'></input></div>");
		sb.append("<div class='bold red' id='diag'>&nbsp;</div>");
		AC.SmallScreen.prototype.init.call(this, 480, sb.toString(), "Ajouter", true, 
				"Ajout d'un nouveau camion");
		this.show();
		this._nom = this._content.find("#nom");
		this._diag = this._content.find("#diag");
		this._nom.val("");
		this.enable();
		var self = this;
		this._nom.off(APP.KEYUP).on(APP.KEYUP, function(event){
			APP.NOPROPAG(event);
			self.enable();
		});
	},
	
	enEdition : function() {
		return this._nom.val();
	},
	
	enErreur : function() {
		this.nom = this._nom.val();
		if (this.tournee.camionDeNom(this.nom)) {
			this._diag.html("Un camion ayant ce nom existe déjà. Donner un autre nom.");
			return true;
		}
		this._diag.html("&nbsp;");
		return false;
	},
		
	enregistrer : function() {
		this.tournee.ajouterCamion(this.nom);
		var arg = {op:"60"};
		arg.gap = this.caller.gap;
		arg.codeLivr = this.caller.codeLivr;
		arg.jsonData = this.tournee.json();
		arg.operation = "Enregistrement d'un nouveau camion";
		AC.Req.post(this, "alterconsos", arg, function(){
			AC.Message.info("Enregistrement fait.");
			this.close();
		}, "Echec de l'enregistrement : " );
	}
	
}
AC.declare(AC.AjouterCamion, AC.SmallScreen);

/****************************************************************/
AC.RenommerCamion = function(){}
AC.RenommerCamion._static = {}
AC.RenommerCamion._proto = {
	className : "RenommerCamion",
	
	init : function(caller, target){
		this.nca = target.attr("data-camion");
		this.caller = caller;
		this.tournee = this.caller.tournee;
		this.cam = this.tournee.camionDeNom(this.nca);
		if (!this.cam) {
			AC.Message.error("Camion " + this.ca + " inconnu.");
			this.close();
			return;
		}
		var sb = new StringBuffer();
		sb.append("<div class='acSpace2'></div>"
				+ "<div class='acLabel'>Nouveau nom du camion : </div>"
				+ "<div class='acEntry'><input id='nom'></input></div>");
		sb.append("<div class='bold red' id='diag'>&nbsp;</div>");
		AC.SmallScreen.prototype.init.call(this, 480, sb.toString(), "Renommer", true, 
				"Renommer le camion \"" + this.cam.nom + "\".");
		this.show();
		this._nom = this._content.find("#nom");
		this._diag = this._content.find("#diag");
		this._nom.val(this.cam.nom);
		this.enable();
		var self = this;
		this._nom.off(APP.KEYUP).on(APP.KEYUP, function(event){
			APP.NOPROPAG(event);
			self.enable();
		});
	},
	
	enEdition : function() {
		return this._nom.val() != this.cam.nom;
	},
	
	enErreur : function() {
		this.nom = this._nom.val();
		if (this.nom.length == 0) {
			this._diag.html("Un nom doit avoir au moins un caractère.");
			return true;
		}
		if (this.nom == this.cam.nom) {
			this._diag.html("&nbsp;");
			return false;
		}
		if (this.tournee.camionDeNom(this.nom)) {
			this._diag.html("Un camion ayant ce nom existe déjà. Donner un autre nom.");
			return true;
		}
		this._diag.html("&nbsp;");
		return false;
	},
		
	enregistrer : function() {
		this.tournee.setNomCamion(this.cam, this.nom);
		var arg = {op:"60"};
		arg.gap = this.caller.gap;
		arg.codeLivr = this.caller.codeLivr;
		arg.jsonData = this.tournee.json();
		arg.operation = "Enregistrement d'un changement de nom d'un camion";
		AC.Req.post(this, "alterconsos", arg, function(){
			AC.Message.info("Enregistrement fait.");
			this.close();
		}, "Echec de l'enregistrement : " );
	}
	
}
AC.declare(AC.RenommerCamion, AC.SmallScreen);

/****************************************************************/
AC.ChangerCamion = function(){}
AC.ChangerCamion._static = {}
AC.ChangerCamion._proto = {
	className : "ChangerCamion",
	
	init : function(caller, target){
		this.gac = Util.dataIndex(target);
		var eltGac = APP.Ctx.dir.getElement(1, this.gac);
		if (!eltGac)
			eltGac = {label: "#" + this.gac}

		this.caller = caller;
		this.tournee = this.caller.tournee;
		this.cfsi = this.tournee.gac(this.gac);
		this.cfs = [this.cfsi[0], this.cfsi[1]];
		this.lst = this.tournee.lstCamions();
				
		AC.SmallScreen.prototype.init.call(this, 600, this.paintIt(), "Valider", true, 
				"Changer le(s) camion(s) livrant " + eltGac.label.escapeHTML());
		this.show();
		this.registerIt();
	},
	
	registerIt : function(){
		this.enable();
		AC.oncl(this, this._content.find(".camion"), function(target){
			var fs = Util.dataIndex(target, "fs");
			this.cfs[fs] = Util.dataIndex(target);
			this._content.html(this.paintIt());
			this.registerIt();
		})
	},
	
	paintIt : function() {
		var sb = new StringBuffer();
		sb.append("<div class='acSpace2'>Cliquer sur le nouveau camion respectivement pour le "
				+ "\"froid\" et le \"sec\"</div>");
		for(var fs = 0; fs < 2; fs++) {
			sb.append("<div class='acILB50'>");
			sb.append("<div class='acSpace1 bold italic large talc'>Camion pour le ");
			sb.append(["froid", "sec"][fs]);
			sb.append("</div><div class='acSpace1'></div>")
			for(var i = 0, x = null; x = this.lst[i]; i++) {
				var ic = x.code;
				var ici = this.cfsi[fs];
				var icn = this.cfs[fs];
				if (ic == icn)
					var cl = "inverse";
				else
					var cl = ic == ici ? "bgyellow" : "";
				sb.append("<div class='camion " + cl + "' data-index='" + ic 
						+ "' data-fs='" + fs + "'>" + x.label + "</div>");
			}
			sb.append("</div>");
		}
		return sb.toString();
	},
	
	enEdition : function() {
		return (this.cfs[0] != this.cfsi[0]) || (this.cfs[1] != this.cfsi[1]);
	},
	
	enErreur : function() {
		return false;
	},
		
	enregistrer : function() {
		this.tournee.setGac(this.gac, this.cfs);
		var arg = {op:"60"};
		arg.gap = this.caller.gap;
		arg.codeLivr = this.caller.codeLivr;
		arg.jsonData = this.tournee.json();
		arg.operation = "Changement de camion d'un groupe";
		AC.Req.post(this, "alterconsos", arg, function(){
			AC.Message.info("Enregistrement fait.");
			this.close();
		}, "Echec de l'enregistrement : " );
	}
	
}
AC.declare(AC.ChangerCamion, AC.SmallScreen);

/*************************************************************/
AC.Livraison2 = function(gap, codeLivr, gac){
	this.gap = gap;
	this.gac = gac;
	this.codeLivr = codeLivr;
	this.livr = APP.Ctx.cal.getLivr(this.gap, this.codeLivr);
	AC.Calendrier.attach(this);
	AC.Directory.attach(this);
	return AC.Screen.prototype.init.call(this, this);
}
AC.Livraison2._static = {
	dates : ["d'ouverture aux commandes", "limite de commande", "d'expédition", "d'archivage"],
	lj : ["le jour même", "le lendemain", "le surlendemain", "le lundi suivant", "le mardi suivant",
	      "le mercredi suivant", "le jeudi suivant", "le vendredi suivant", 
	      "le samedi suivant", "le dimanche suivant"]
}
AC.Livraison2._proto = {
	className : "LivrDef",
	
	close : function(){
		AC.Calendrier.detach(this);
		AC.Directory.detach(this);
		for(var i = 0, x = null; x = this.gacs[i]; i++)
			x.cellGac.detach(this);
		AC.Screen.prototype.close.call(this);
	},
	
	lj : function(i){
		return i > 2 ? "J+" + i : AC.Livraison2.lj[i < 0 ? 2 - i : i];
	},
	
	ex : function(){
		return this.expedition ? this.expedition : this.livr.expedition;
	},
	
	ov : function(){
		return this.ouverture ? this.ouverture : this.livr.ouverture;
	},
	
	li : function(){
		return this.limite ? this.limite : this.livr.limite;
	},
	
	hli : function(){
		if (APP.Ctx.currentMode == 3)
			return this.hliac();
		return this.hlimite != -1 ? this.hlimite : this.livr.hlimite;
	},

	hliac : function(){
		var hx = this.hlimite != -1 ? this.hlimite : this.livr.hlimite;
		if (this.slivr)
			hx = hx > this.slivr.hlimac ? hx - this.slivr.hlimac : 1;
			return hx;
	},

	ar : function(){
		return this.archive ? this.archive : this.livr.archive;
	},
	
	enEdition : function() {
		return this.expedition || this.ouverture || this.limite || this.archive || this.hlimite != -1;
	},

	onCellsChange : function(cells){
		this.display();
	},
	
	undo : function() {
		this.display();
	},
	
	compile : function(){
		this.eltGap = AC.GAP.elt(this.gap);
		if (!this.eltGap)
			this.eltGap = {initiales:"#" + this.gap, label:"#" + this.gap};
		this.gacs = [];
		var toSync = false;
		this.slivr = null;
		for(var g in this.livr.slivrs){
			var gac = parseInt(g, 10);
			var e = AC.GAC.elt(gac);
			if (!e)
				e = {initiales:"#"+gac, label:"#"+gac}
			var cellGac = AC.GAC.getN(gac);
			if (cellGac.version <= 0)
				toSync = true;
			cellGac.attach(this);
			if (gac == this.gac)
				this.slivr = this.livr.slivrs[gac];
			this.gacs.push({label:Util.editEltH(e), sl:this.livr.slivrs[g], 
				tri:(this.gac == gac ? "0" : "1") + e.initiales, cellGac: cellGac});
		}
		this.gacs.sort(AC.Sort.t);
		this.state = 0;
		this.ouverture = 0;
		this.limite = 0;
		this.expedition = 0;
		this.archive = 0;
		this.jouverture = -1;
		this.jlimite = -1;
		this.hlimite = -1;
		this.jarchive = -1;
		this.hlimac = this.slivr ? this.slivr.hlimac : -1;
		var iaj = AC.AMJ.idxMois(AC.AMJ.aujourdhui);
		this.idmin = iaj > 2 ? iaj - 2 : 0 ;
		this.statut = APP.Ctx.cal.getStatut(this.livr);
		this.WL = !APP.Ctx.authUsr && this.statut < 7 && !this.gac;
		this.WL2 = this.WL && !this.livr.suppr;
		this.WSL = !APP.Ctx.authUsr && this.statut < 7 && !this.livr.suppr;
		this.dx = this.ex();
		this.idx = AC.AMJ.idxMois(this.dx);
		this.idd = this.idx > 2 ? this.idx - 2 : 0;
		this.idf = this.idx >= 36 ? this.idx : this.idx + 3;
		if (toSync)
			AC.Req.sync();
	},
	
	paintTitle : function(){
		var sb = new StringBuffer();
		sb.append("<div class='bold italic large'>Groupement : " + Util.editEltH(this.eltGap) 
				+ " - Livraison : #" + this.codeLivr + "</div>");
		if (this.livr.suppr) {
			sb.append("<div class='bold red'>Suspendue depuis le : " + AC.AMJ.dateLongue(this.livr.suppr) 
					+ "</div>");	
		};
		return sb.toString();
	},
	
	gen4mois : function(){
		var sb = new StringBuffer();
		for (var i = this.idd, j = 0; i <= this.idf; i++, j++)
			AC.AMJ.genMois(sb, AC.AMJ.tousMois[i]);
		return sb.toString();
	},
	
	hh : function(){
		var sb = new StringBuffer();
		sb.append("<div id='hhdiv'><div>");
		for(var i = 1; i <= 24; i++){
			if (i == 7 || i == 13 || i == 19)
				sb.append("</div><div>");
			sb.append("<div class='acHH' data-index='" + i + "'>" + i + "h</div>");
		}
		sb.append("</div></div>");
		return sb.toString();
	},
	
	paintContent : function(){
		var s = this.gen4mois();
		var sb = new StringBuffer();
		var tb = new AC.Table(this.WL2 ? 2 : 1, false, false, [1,3,2]);
		tb.row("Date de création", AC.AMJ.dateLongue(this.livr.creation));
		
		var x = "<div class='acCalOv acCalZZ'>" + AC.AMJ.dateLongue(this.ov()) + "</div>";
		var b = "<div class='action actDate' data-index='1'>Modifier la date</div>";
		tb.row("Date d'ouverure aux commandes", x, b);

		x = "<div class='acCalZZ acCalLi'>" + AC.AMJ.dateLongue(this.li()) + "</div>" + this.hh();
		b = "<div class='action actDate' data-index='2'>Modifier la date</div>";
		tb.row("Date limite de commande", x, b);

		var x = "<div class='acCalEx acCalZZ'>" + AC.AMJ.dateLongue(this.ex()) + "</div>";
		var b = "<div class='action actDate' data-index='3'>Modifier la date</div>";
		tb.row("Date d'expédition", x, b);

		var x = "<div class='acCalAr acCalZZ'>" + AC.AMJ.dateLongue(this.ar()) + "</div>";
		var b = "<div class='action actDate' data-index='4'>Modifier la date</div>";
		tb.row("Date d'archivage", x, b);
		sb.append(tb.flush());
		sb.append("<div class='acSpace1 bold large red talc'>")
		if (this.state) {
			sb.append("Cliquer ci-dessous sur la date " 
					+ AC.Livraison2.dates[this.state -1] + " choisie </div>");
		} else
			sb.append("&nbsp;</div>");

		sb.append("<div id='calgen' style='text-align:center'>");
		if (this.WL2) {
			sb.append("<div id='avant' data-index='5' class='action actDate' style='float:left;margin-top:1rem'>&lt;&lt;&nbsp;Avant</div>");
			sb.append("<div id='apres' data-index='6' class='action actDate' style='float:right;margin-top:1rem'>Après&nbsp;&gt;&gt;</div>");
			sb.append("<div class='acEnd'></div>");
		}
		sb.append(s);
		sb.append("</div>");
		sb.append("<div class='acSpaceBT'></div>");
		
		if (this.WL){
			if (this.livr.suppr)
				sb.append("<div><div class='action activer inlineblock' data-index='0'>Ré-activer cette livraison</div></div>");
			else {
				sb.append("</div><div class='action activer inlineblock' data-index='0'>Suspendre cette livraison</div></div>");
				sb.append("<div class='acSpace1'>" 
					+ "<div class='acdd-box bold italic' data-ac-id='livrs'></div>"
					+ "<div data-ac-id='livrslist'></div></div>");
				sb.append("<div><div class='action inlineblock' id='recopier' data-ac-id='copiePrix'>Recopier</div></div>");
			}
			sb.append("<div class='acSpaceBT'>");
			sb.append("<div class='acdd-box bold italic' data-ac-id='gacs'>Ajouter un groupe à livrer :</div>"
					+ "<div data-ac-id='gacslist'></div></div></div>");
			sb.append("<div class='acSpaceBT'></div>");
		}
		
		var tb = new AC.Table(3, true, false, [1,2,2,3]);
		tb.clazz("inverse bold italique");
		tb.row("Groupe livré", "Déchargement le ", "Distribution le ", "Actions");
		for(var i = 0, x = null; x = this.gacs[i]; i++){
			var bx = !this.gac || x.sl.gac == this.gac;
			var c1 = x.label;
			if (x.sl.suppr)
				c1 += "<br><span class='italic red'>Livraison annulée le " 
					+ AC.AMJ.dateCourte(x.sl.suppr) + "</span>";
			if (bx) {
				var e1 = x.cellGac.get(1);
				if (e1 && e1.localisation)
					c1 += this.adr(e1.localisation);
			}
			var c2 = "<div class='talc'>" + this.lj(x.sl.jlivr) + (x.sl.hlivr ? " " + x.sl.hlivr + "h" : "")
				+ "<br>" + AC.AMJ.dateCourte(x.sl.dlivr) + "</div>";
			if (bx && x.sl.adresseL)
				c2 += this.adr(x.sl.adresseL);
			var c3 = "<div class='talc'>" + this.lj(x.sl.jdistrib) 
				+ (" de " + x.sl.hdistrib + "h à " + x.sl.fdistrib + "h")
				+ "<br>" + AC.AMJ.dateCourte(x.sl.distrib) + "</div>";
			if (bx && x.sl.adresseD)
				c3 += this.adr(x.sl.adresseD);
			var c4 = "";
			if (this.WSL && bx) {
				c4 = "<div class='action edgac' data-index='" + x.sl.gac + "'>Changer jours / heures</div>";
				c4 += "<div class='action activer' data-index='" + x.sl.gac + "'>" 
					+ (x.sl.suppr ? "Ré-activer" : "Annuler") + "</div>";
			}
			tb.row(c1, c2, c3, c4);
		}
		sb.append(tb.flush());
		return sb.toString();
	},

	adr : function(x){
		var sb = new StringBuffer();
		sb.append("<div><a target='_blank' href=\"http://maps.google.com/maps?q="); 
		sb.append(encodeURIComponent(x));
		sb.append("\">" + x + "</a></div>");
		return sb.toString();
	},
	
	getJJ : function(aammjj){
		return this._calgen.find("[data-aammjj='" + aammjj + "']");
	},
	
	register : function(){
		this._calgen = this._content.find("#calgen");
		this._act = this._content.find(".activer");
		this._HH = this._content.find("#hhdiv");
		this._HH.find("[data-index='" + this.hli() + "']").addClass("acHHSel");
		if (APP.Ctx.currentMode == 2)
			this._HH.find("[data-index='" + this.hliac() + "']").addClass("acHHSel");
		this.getJJ(this.ov()).addClass("acCalOv");
		this.getJJ(this.li()).addClass("acCalLi");
		this.getJJ(this.ex()).addClass("acCalEx");
		this.getJJ(this.ar()).addClass("acCalAr");
		Util.btnEnable(this._content.find("#avant"), (this.state == 3 && this.idmin < this.idd));
		Util.btnEnable(this._content.find("#apres"), ((this.state == 3 || this.state == 4) && this.idf < 35 ));
		
		if (this.WL || this.WSL)
			AC.oncl(this, this._act, this.activer);
		
		AC.oncl(this, this._content.find(".edgac"), function(target){
			var gac = Util.dataIndex(target);
			for(var i = 0; i < this.gacs.length; i++)
				if (this.gacs[i].sl.gac == gac)
					new AC.EditSlivr().init(this, null, this.gacs[i], this.livr.expedition, this.enEdition());
		});
		
		if (this.WL2) {
			this._copiePrix = APP.id(this, "copiePrix");
			Util.btnEnable(this._copiePrix, false);
			var decorl = APP.Ctx.cal.decorLivrsGAP(this.gap, 
				"Livraison dont il faut recopier les prix / disponibilités : (cliquer pour choisir)", this.codeLivr);
			new AC.Selector3(this, "livrs", decorl, false);
			this._livrs.val(0);
			var self = this;
			this._livrs.jqCont.off("dataentry").on("dataentry", function(){
				var cl = self._livrs.val();
				var s = "";
				if (cl && cl != 999) {
					for(var i = 0, dc = null; dc = decorl[i]; i++)
						if (dc.code == cl)
							s = dc.label;
				}
				self._livrs.jqCont.html("Livraison dont il faut recopier les prix / disponibilités : " 
						+ (cl == 999 ? "REFERENCE" : (cl ? s : "(cliquer pour choisir)")));
				self.processLivrs(cl);
			})

			AC.oncl(this, this._HH.find(".acHH"), function(target){
				this.hlimite = Util.dataIndex(target);
				if (this.hlimite == this.livr.hlimite)
					this.hlimite = -1;
				this._HH.find(".acHH").removeClass("acHHSel");
				this._HH.find("[data-index='" + this.hli() + "']").addClass("acHHSel");
				this.enable();
			});
			
			AC.oncl(this, this._content.find(".actDate"), function(target){
				var ida = Util.dataIndex(target);
				if (ida == 5){
					if (this.idd > this.idmin)
						this.idd--;
					this.idf = this.idd + 3;
				}
				if (ida == 6){
					if (this.idf < 17)
						this.idf++;
					this.idd = this.idf - 3;
				}
				if (ida < 5)
					this.state = ida;
				this.redisplay();
			});
			
			var lgacs = this.livr.slivrs;
			var decor = APP.Ctx.dir.decor(1, null, function(elt) {
				return !(elt.removed || lgacs[elt.code]);
			}, true);
			new AC.Selector3(this, "gacs", decor, false);
			this._gacs.jqCont.off("dataentry").on("dataentry", function(event){
				APP.NOPROPAG(event);
				var arg = {op:"26"};
				arg.gap = self.gap;
				arg.codeLivr = self.codeLivr;
				arg.gac = self._gacs.val();
				arg.operation = "Création d'une nouvelle livraison à un groupe";
				AC.Req.post(this, "alterconsos", arg, "Nouvelle livraison à un groupe créée", 
						"Echec de la création : ");
			});

			if (this.state) {
				AC.oncl(this, this._calgen.find(".cal"), function(target){
					var amj = Util.dataIndex(target, "aammjj");
					switch (this.state){
					case 1 : { this.selectOv(amj); break; }
					case 2 : { this.selectLi(amj); break; }
					case 3 : { this.selectEx(amj); break; }
					case 4 : { this.selectAr(amj); break; }
					}
					this.redisplay();
				});
			}
		}
		this.enable();
	},

	processLivrs: function(cl){
		if (cl) {
			this.srcCodeLivr = cl;
			Util.btnEnable(this._copiePrix, true);
			APP.oncl(this, this._copiePrix, function(target){
				this.copierPrix();
			});
		} else
			Util.btnEnable(this._copiePrix, false);
	},

	copierPrix : function() {
		var arg = {op:"32"};
		arg.gap = this.gap;
		arg.codeLivr = this.codeLivr;
		arg.srcCodeLivr = this.srcCodeLivr == 999 ? 0 : this.srcCodeLivr;
		arg.operation = "Recopie des prix et disponibilités";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info(arg.operation + " faite");
			this._livrs.val(0);
			Util.btnEnable(this._copiePrix, false);
		}, "Echec de la " + arg.operation + " : ");
	},
	
	activer : function(target) {
		var gac = parseInt(target.attr("data-index"), 10);
		this.sLivr = this.livr.slivrs[gac];
		var suppr = !gac ? this.livr.suppr : (this.sLivr ? this.sLivr.suppr : 0);
		var op = "Suspension de la livraison";
		var msg = "suspension";
		var cmd = "27";
		if (suppr) {
			op = "Réactivation de la livraison";
			cmd = "28";
			msg = "réactivation";
		}
		var arg = {op:cmd};
		arg.gap = this.gap;
		arg.codeLivr = this.codeLivr;
		if (gac)
			arg.gac = gac;
		arg.operation = op;
		AC.Req.post(this, "alterconsos", arg, op + " faite", "Echec de la " + msg + " : ");
	},

	selectOv : function(amj){
		var nli = AC.AMJ.nbj(this.li());
		var nov = AC.AMJ.nbj(amj);
		if (nov > nli) {
			AC.error("La date d'ouverture doit antérieure ou égale à la date limite");
			return;
		}
		this.ouverture = amj;
		this.jouverture = nli - nov;
		if (this.jouverture == this.livr.jouverture)
			this.jouverture = -1;
		if (this.ouverture == this.livr.ouverture)
			this.ouverture = 0;
		// this.state = 0;		
	},

	selectLi : function(amj){
		var nex = AC.AMJ.nbj(this.ex());
		var nli = AC.AMJ.nbj(amj);
		if (nli > nex) {
			AC.error("La date limite doit antérieure ou égale à la date d'expédition");
			return;
		}
		this.jlimite = nex - nli;
		var nli = nex - this.jlimite;
		this.limite = AC.AMJ.aammjj(nli);
		if (this.jlimite == this.livr.jlimite)
			this.jlimite = -1;
		if (this.limite == this.livr.limite)
			this.limite = 0;
		if (this.ov() > this.li()){
			this.ouverture = this.limite;
			this.jouverture = 0;
		}
		if (this.jouverture == this.livr.jouverture)
			this.jouverture = -1;
		if (this.ouverture == this.livr.ouverture)
			this.ouverture = 0;
	},
	
	selectEx : function(amj){
		var ex = this.ex();
		var nbjLim = this.memeDecalage(ex, this.li(), amj);
		var nbjOuv = this.memeDecalage(ex, this.ov(), amj);
		this.expedition = this.livr.expedition == amj ? 0 : amj;
		this.jlimite = AC.AMJ.nbj(this.ex()) - nbjLim;
		var nex = AC.AMJ.nbj(this.ex());
		this.limite = AC.AMJ.aammjj(nex - this.jlimite);
		if (this.jlimite == this.livr.jlimite)
			this.jlimite = -1;
		if (this.limite == this.livr.limite)
			this.limite = 0;
		this.jouverture = nbjLim - nbjOuv;
		this.ouverture = AC.AMJ.aammjj(AC.AMJ.nbj(this.li()) - this.jouverture);
		if (this.jouverture == this.livr.jouverture)
			this.jouverture = -1;
		if (this.ouverture == this.livr.ouverture)
			this.ouverture = 0;
		var nja = this.jarchive != -1 ? this.jarchive : this.livr.jarchive;
		this.archive = AC.AMJ.aammjj(nex + nja);
		if (this.archive == this.livr.archive)
			this.archive = 0;
	},
	
	memeDecalage : function(d1, d2, d3){
		var s1 = AC.AMJ.nbs(d1);
		var s2 = AC.AMJ.nbs(d2);
		var n = s1 - s2;
		var j2 = AC.AMJ.js(d2);
		var s3 = AC.AMJ.nbs(d3);
		// d2 est une date N semaines avant d1 et un jour de semaine donné d2j
		// d4 est une date N semaines avant d3 et le même jour de semaine d2j
		var d = AC.AMJ.aammjj(s3 - n, j2);
		return AC.AMJ.nbj(d);
	},

	selectAr : function(amj){
		var njar = AC.AMJ.nbj(amj);
		var njex = AC.AMJ.nbj(this.ex());
		if (njar < njex + 14 || njar > njex + 90) {
			var m = "La date d'archivage doit entre 14 et 90 jours après la date d'expédition";
			alert(m);
			AC.error(m);
			return;
		}
		this.jarchive = njar - njex;
		this.archive = this.archive == this.livr.archive ? 0 : amj;
	},

	enregistrer : function() {
		var arg = {op:"26"};
		arg.gap = this.gap;
		arg.codeLivr = this.codeLivr;
		if (this.jouverture != -1)
			arg.jouverture = this.jouverture;
		if (this.jlimite != -1)
			arg.jlimite = this.jlimite;
		if (this.expedition)
			arg.expedition = this.expedition;
		if (this.hlimite != -1)
			arg.hlimite = this.hlimite == 24 ? 0 : this.hlimite;
		if (this.jarchive != -1)
			arg.jarchive = this.jarchive;
		arg.operation = "Enregistrement Livraison";
		AC.Req.post(this, "alterconsos", arg, "Enregistrement fait", "Echec de l'enregistrement : ");
	}

}
AC.declare(AC.Livraison2, AC.Screen);
/***************************************************/
AC.EditSlivr = function(){}
AC.EditSlivr._static = {	
}
AC.EditSlivr._proto = {
	className: "EditSlivr",
	
	init : function(caller, callback, sl, expedition, enEdition){
		this.expedition = expedition;
		this.sl = sl;
		this.localisation = AC.GAC.get(sl.sl.gac).get(1).localisation;
		this.reset();
		this.ljd = [];
		for(var i = 0, x = null; x = AC.Livraison2.lj[i]; i++)
			this.ljd.push({code:i < 3 ? i : 2 - i, label:x});
		this.lhminac = [ {code:0, label:"Même heure"},
		                 {code:2, label:"2h avant même jour"},
		                 {code:4, label:"4h avant même jour"},
		                 {code:8, label:"8h avant même jour"}		                 
		                ];
		if (enEdition) {
			var html = "<div class='large bold italic red'>Valider ou annuler les modifications faites "
				+ " sur la livraison avant de modifier les dates et heures de déchargement / distribution à un groupe"
				+ "</div>";
			AC.SmallScreen.prototype.init.call(this, -700, html, false, true, 
					"Déchargement / distribution de " + this.sl.label);
		} else {
			AC.SmallScreen.prototype.init.call(this, -700, this.paint(), "Valider", true, 
					"Déchargement / distribution de " + this.sl.label);
		}
		this.show();
		this.register();
		this._adlinp.val(this.nsl.adresseL);
		this._addinp.val(this.nsl.adresseD);
		this._reducinp.val(this.nsl.reduc);
		this.setAdl(this.nsl.adresseL);
		this.setAdd(this.nsl.adresseD);
		this.setReduc(this.nsl.reduc);
	},
	
	reset : function(){
		var sl = this.sl.sl;
		this.nsl = {hlivr:sl.hlivr, jlivr:sl.jlivr, hdistrib:sl.hdistrib, 
				fdistrib:sl.fdistrib, jdistrib:sl.jdistrib, dlivr:sl.dlivr, distrib:sl.distrib,
				adresseL:sl.adresseL, adresseD:sl.adresseD, hlimac:sl.hlimac, reduc:sl.reduc, fraisgap0:sl.fraisgap0}
	},
	
	undo : function() {
		this.reset();
		this.refresh();
		this._adlinp.val(this.nsl.adresseL);
		this._addinp.val(this.nsl.adresseD);
		this._reducinp.val(this.nsl.reduc);
	},
	
	hh : function(id){
		var sb = new StringBuffer();
		sb.append("<div id='" + id + "'><div>");
		for(var i = 1; i <= 24; i++){
			if (i == 7 || i == 13 || i == 19)
				sb.append("</div><div>");
			sb.append("<div class='acHH' data-index='" + i + "'>" + i + "h</div>");
		}
		sb.append("</div></div>");
		return sb.toString();
	},

	paint : function() {
		var sb = new StringBuffer();
		sb.append("<div class='acDivScroll'>");
		sb.append("<div><div id='undo' class='action3 inlineblock'>Annuler les changements faits</div></div>");
		sb.append("<div class='italic bold'>Expédition le " + AC.AMJ.dateLongue(this.expedition) + "</div>");
		sb.append("<div class='acSpace05'>Adresse habituelle : <span id='adh'class='italic bold'></span><a class='acMapsBtn2' id='adhab' target='_blank'></a></div>");
		sb.append("<div class='acSpace05'><div>Adresse de livraison (vide si habituelle) : </div>" 
				+ "<input class='acadrinp' id='adlinp'><a class='acMapsBtn2' id='adl' target='_blank'></a></div>");
		sb.append("<div class='acSpace05'><div>Adresse de distribution (vide si habituelle) : </div>" 
				+ "<input class='acadrinp' id='addinp'><a class='acMapsBtn2' id='add' target='_blank'></a></div>");
		var disab = APP.Ctx.authType == 2 ? "" : " ui-disabled";
		sb.append("<div class='acSpace05'><div>% de réduction exceptionnelle (vide si aucune - 13 pour 13%) : </div>" 
				+ "<input class='acreducinp" + disab + "' id='reducinp'><span class='red bold' id='reducdiag'></span></div>");
		sb.append("<div class='acSpace05" + disab + "'><div data-ac-id='fraisgap0'></div></div>");
		sb.append("<div class='acSpace2 bold large italic orange'>Heure limite de commande pour les alterconsos :</div>");
		sb.append("<div class='acSpace1q'><div data-ac-id='hlimac'></div></div>");
		sb.append("<div class='acSLCols'><div class='acSLCol'>");
		sb.append("<div id='dech' class='bold large italic orange'>Déchargement :</div>");
		sb.append("<div class='acSpace1q'><div data-ac-id='jlivr'></div></div>");
		sb.append("<div class='acSpace2 bold large italic orange'>Heure de déchargement :</div>");
		sb.append(this.hh("hlivr"));
		sb.append("</div>");
		
		sb.append("<div class='acSLCol'>");
		sb.append("<div id='distr' class='bold large italic orange'>Distribution :</div>");
		sb.append("<div class='acSpace1q'><div data-ac-id='jdistrib'></div></div>");
		sb.append("<div class='acSpace2 bold large italic orange'>Heure de début :</div>");
		sb.append(this.hh("hdistrib"));
		sb.append("<div class='acSpace2 bold large italic orange'>Heure de fin :</div>");
		sb.append(this.hh("fdistrib"));
		sb.append("</div></div></div>");
		return sb.toString();
	},
	
	register : function() {
		var sl = this.sl.sl;
		this._undo = this._content.find("#undo");
		this._dech = this._content.find("#dech");
		this._distr = this._content.find("#distr");
		this._hlivr = this._content.find("#hlivr");
		this._hdistrib = this._content.find("#hdistrib");
		this._fdistrib = this._content.find("#fdistrib");
		
		this._adh = this._content.find("#adh");
		this._adhab = this._content.find("#adhab");
		this._adl = this._content.find("#adl");
		this._adlinp = this._content.find("#adlinp");
		this._add = this._content.find("#add");
		this._addinp = this._content.find("#addinp");
		this._reducinp = this._content.find("#reducinp");
		this._reducdiag = this._content.find("#reducdiag");
		
		AC.oncl(this, this._undo, this.undo);

		var self = this;
		new AC.RadioButton(this, "hlimac", this.lhminac);
		this._hlimac.jqCont.off("dataentry").on("dataentry", function() {
			self.nsl.hlimac = self._hlimac.val();
			self.refresh();
		});

		new AC.RadioButton(this, "jlivr", this.ljd);
		this._jlivr.jqCont.off("dataentry").on("dataentry", function() {
			self.nsl.jlivr = self._jlivr.val();
			self.refresh();
		});

		new AC.RadioButton(this, "jdistrib", this.ljd);
		this._jdistrib.jqCont.off("dataentry").on("dataentry", function() {
			self.nsl.jdistrib = self._jdistrib.val();
			self.refresh();
		});

		AC.oncl(this, this._hlivr.find(".acHH"), function(target){
			this.setHH("hlivr", target);
			this.refresh();
		});
		AC.oncl(this, this._hdistrib.find(".acHH"), function(target){
			this.setHH("hdistrib", target);
			this.refresh();
		});
		AC.oncl(this, this._fdistrib.find(".acHH"), function(target){
			this.setHH("fdistrib", target);
			this.refresh();
		});
		if (this.localisation) {
			this._adh.text(this.localisation);
			this._adhab.attr("href", "http://maps.google.com/maps?q=" + encodeURIComponent(this.localisation));
		} else {
			this._adh.text("inconnue");
			this._adhab.css("display", "none");
		}
		var self = this;
		this._adlinp.off(APP.KEYUP).on(APP.KEYUP, function(event){
			APP.NOPROPAG(event);
			self.setAdl(self._adlinp.val());
			self.enable();
		});
		this._addinp.off(APP.KEYUP).on(APP.KEYUP, function(event){
			APP.NOPROPAG(event);
			self.setAdd(self._addinp.val());
			self.enable();
		});
		this._reducinp.off(APP.KEYUP).on(APP.KEYUP, function(event){
			APP.NOPROPAG(event);
			self.setReduc(self._reducinp.val());
			self.enable();
		});
		new AC.CheckBox2(this, "fraisgap0", "Pas de prélèvement au titre du groupement");
		this._fraisgap0.val(this.sl.fraisgap0);
		var self = this;
		this._fraisgap0.jqCont.off("dataentry").on("dataentry", function(){
			self.setfraisgap0(self._fraisgap0.val());
		});

		this.refresh();
	},

	enErreur : function() {
		return 	this.nsl.reduc == -1;
	},

	setfraisgap0 : function(x) {
		this.nsl.fraisgap0 = x ? 1 : 0;
	},
	
	setReduc : function(x){
		if (x) {
			var txreduc = parseInt(x, 10);
			if (isNaN(txreduc) || txreduc < 0 || txreduc > 100) {
				this.nsl.reduc = -1;
				this._reducdiag.html("&nbsp;&nbsp;Saisir une valeur entre 0 et 100");
			} else {
				this._reducdiag.html("");
				this.nsl.reduc = txreduc;
			}
		} else {
			this._reducdiag.html("");
			this.nsl.reduc = 0;
		}	
	},

	setAdd : function(x){
		if (x) {
			this.nsl.adresseD = x;
			this._add.attr("href", "http://maps.google.com/maps?q=" + encodeURIComponent(x));
			this._add.css("display", "inline-block");
		} else {
			this.nsl.adresseD = "";
			this._add.css("display", "none");
		}	
	},

	setAdl : function(x){
		if (x) {
			this.nsl.adresseL = x;
			this._adl.attr("href", "http://maps.google.com/maps?q=" + encodeURIComponent(x));
			this._adl.css("display", "inline-block");
		} else {
			this.nsl.adresseL = "";
			this._adl.css("display", "none");
		}	
	},

	setHH : function(prop, target) {
		var cont = this["_" + prop];
		if (target)
			this.nsl[prop] = Util.dataIndex(target);
		cont.find(".acHH").removeClass("acHHSel");
		cont.find("[data-index='" + this.nsl[prop] + "']").addClass("acHHSel");
	},
	
	refresh : function(){
		var sl = this.sl.sl;
		this.setHH("hlivr");
		this.setHH("hdistrib");
		this.setHH("fdistrib");
		if (this.nsl.fdistrib < this.nsl.hdistrib) {
			this.nsl.fdistrib = this.nsl.hdistrib;
			this.setHH("fdistrib");
		};
		this._fraisgap0.val(this.nsl.fraisgap0);
		this._reducinp.val(this.nsl.reduc);
		this._hlimac.val(this.nsl.hlimac);
		this._jlivr.val(this.nsl.jlivr);
		this._jdistrib.val(this.nsl.jdistrib);
		APP.Ctx.cal.setSlivr(this.nsl, this.expedition);
		this._dech.html("Déchargement :<br>" + AC.AMJ.dateCourte(this.nsl.dlivr));
		this._distr.html("Distribution :<br>" + AC.AMJ.dateCourte(this.nsl.distrib));
		this.enable();
	},
	
	enEdition : function(){
		var sl = this.sl.sl;
		var nsl = this.nsl;
		var b = sl.jlivr != nsl.jlivr || sl.jdistrib != nsl.jdistrib
			|| sl.hlivr != nsl.hlivr || sl.hdistrib != nsl.hdistrib || sl.fdistrib != nsl.fdistrib 
			|| sl.adresseL != nsl.adresseL || sl.adresseD != nsl.adresseD || sl.hlimac != nsl.hlimac 
			|| sl.reduc != nsl.reduc || sl.fraisgap0 != nsl.fraisgap0;
		Util.btnEnable(this._undo, b);
		return b;
	},
	
	enregistrer : function() {
		var sl = this.sl.sl;
		var nsl = this.nsl;
		var arg = {op:"26"};
		arg.gap = sl.livr.gap;
		arg.codeLivr = sl.codeLivr;
		arg.gac = sl.gac;
		if (sl.hlimac != nsl.hlimac)
			arg.hlimac = nsl.hlimac;
		if (sl.jlivr != nsl.jlivr)
			arg.jlivr = nsl.jlivr;
		if (sl.hlivr != nsl.hlivr)
			arg.hlivr = nsl.hlivr;
		if (sl.jdistrib != nsl.jdistrib)
			arg.jdistrib = nsl.jdistrib;
		if (sl.hdistrib != nsl.hdistrib)
			arg.hdistrib = nsl.hdistrib;
		if (sl.fdistrib != nsl.fdistrib)
			arg.fdistrib = nsl.fdistrib;
		if (sl.adresseL != nsl.adresseL)
			arg.adresseL = nsl.adresseL;
		if (sl.adresseD != nsl.adresseD)
			arg.adresseD = nsl.adresseD;
		if (sl.reduc != nsl.reduc)
			arg.reduc = nsl.reduc;
		if (sl.fraisgap0 != nsl.fraisgap0)
			arg.fraisgap0 = nsl.fraisgap0;
		arg.operation = "Enregistrement Livraison";
		AC.Req.post(this, "alterconsos", arg, function(){
			this.close();
		}, "Echec de l'enregistrement : ");
	}

}
AC.declare(AC.EditSlivr, AC.SmallScreen);