AC.KBLPGac2 = function(){}
AC.KBLPGac2._static = {
	prefNV : true,
		
	mask1 : AC.Flag.NONCHARGE,
	
	mask2 : AC.Flag.EXCESTR | AC.Flag.PERTETR,

	poidsPrix : [{code: 1, label:"PRIX en euros"},
	             {code: 2, label:"POIDS en Kg"}],

 	destinations : [{code: 1, label:"l'affecter à l'alterconso zoomé"},
	             {code: 2, label:"le mettre sur l'étagère"},
	             {code: 3, label:"le mettre à la poubelle"},
	             {code: 4, label:"changer son poids / prix"}]

}
AC.KBLPGac2._proto = {
	className: "KBLPGac2",
	
	init : function(caller, callback, target){
		AC.KBLPGac2.prefNV = false;
		this.caller = caller;
		this.callback = callback;
		this.target = target;
		
		this.prod = Util.dataIndex(target);
		this.ap = Math.floor(this.prod / 10000);
		this.pr = this.prod % 10000;

		this.gap = this.caller.lv.cellGap.code;
		this.cellGac = this.caller.lv.cellGac;
		this.phase = this.caller.lv.slivr.phase;

		this.gap_prod = this.gap + "_" + this.prod;
		this.euro = !AC.ac2.euro[this.gap_prod];

		this.val = 0;
		this.y = null;
		for(var i = 0, y = null; y = this.caller.lv.bdl[i]; i++){
			if (y.pd.prod == this.prod) {
				this.y = y;
				break;
			}
		}
		if (!this.y) {
			this.callback.call(this.caller);
			return;
		}
		
		var lc = this.caller.lv.cellLivrC;
		this.reduc = lc.reduc;
		this.conv = new AC.Conv(this.y.pd, this.y.cv, this.reduc);
		this.qmax = this.y.cv.qmax;
		this.poids = this.y.cv.poids;
		
		this.flagsCST = this.y.x.flags & (this.phase < 3 ? AC.KBLPGac2.mask1 : AC.KBLPGac2.mask1 | AC.KBLPGac2.mask2);
		this.curAc = 1;

		this.qte = this.y.x.decharge ? this.y.x.qteD : 0;
		this.nqte = this.qte;

		this.camionI = [];
		this.camionC = [];
		this.poubelle = [];
		this.allAc = [];
		this.items = {};
		
		this.items['0'] = {code:0, nbc:0, modlp:false, lpq:[], lprix:[], lprixN:[], ajuste: -1};
		var lst = this.cellGac.getContacts();
		var temp = [];
		for(var i = 0, e = null; e = lst[i]; i++) {
			var x = lc.getAcApPr(false, e.code, this.ap, this.pr);
			if (e.suppr && (!x || x.status != 2 || !x.qte || !x.qteS))
				continue;
			var t = {initiales:e.initiales, code:e.code, label:e.label, 
					status: x ? x.status : 0, ajuste:-1, lpq:[], lprix:[], lprixN:[]};
			if (x && x.status == 2){
				t.lprix = x.lprix;
				t.qte = x.qte;
				t.qteS = x.qteS;
			}
			temp.push({initiales:e.initiales, code:e.code});
			this.items[e.code] = t;
		}
		temp.sort(AC.Sort.gac);
		for(var i = 0, x = null; x = temp[i]; i++)
			this.allAc.push(x.code);

		for (var i = 0, x = 0; x = this.y.x.lprix[i]; i++) {
			var p = Math.floor(x / 1000);
			var ac = x % 1000;
			var k = this.conv.e2p(p).res;
			this.items[ac].lpq.push({p:p, k:k, c:false});
			if (ac == 0)
				this.items[0].lprix.push(p);
		}
		
		// this.y.x.lprixC = [1299000, 1399000]; // TEST
		for (var i = 0, x = 0; x = this.y.x.lprixC[i]; i++) {
			var p = Math.floor(x / 1000);
			this.camionI.push(p);
		}		
		
		var sb = new StringBuffer();		
		
		this.keyboard(sb, false);
		sb.append("<div id='zd' class='z2d'></div>");
		sb.append("<div class='z2gh'>");
		sb.append("<div id='qteTotDech' class='action4 action4b'>Quantité totale déchargée : " + this.qte + "</div>");
		sb.append("<div class='bold moyen'>Pour le prochain paquet cliqué ou ajouté ...</div>");
		sb.append("<div class='z2ghf'>");
		sb.append("<div data-ac-id='poidsPrix'></div>");
		sb.append("<div id='voirSynth' class='action4'>Voir synthèse</div>");
		sb.append("<div style='display:none' id='cacherSynth' class='action4'>Cacher synthèse</div>");
		sb.append("<div id='nvPaquet' class='action4'>Ajouter paquets</div>");
		sb.append("</div><div>");
		sb.append("<div><div data-ac-id='destinations'></div></div>");
		sb.append("</div></div><div id='z2gb' class='z2gb'>");
		sb.append("<div id='synth' class='synthPaquets'></div>");
		sb.append("<div id='zoomac' class='zoomac'></div>");
		sb.append("<div class='moyen inverse'><b>Liste des alterconsos :</b> cliquer sur celui à zoomer</div>");
		sb.append("<div id='zb'></div></div>")
		
		var nv = "Nouvelle version : cliquer ici";
//		var nv = "";
		AC.SmallScreen.prototype.init.call(this, -800, sb.toString(), "Valider", true, 
				this.y.pd.nom.escapeHTML() + "<br>Détail des paquets", nv);
		this._content.css("overflow-y", "hidden");
		this._content.css("margin-top", "0");
		this._content.parent().find("#filler").css("display", "none");

		AC.oncl(this, this._cartouche, function(){
			var self = this;
			this.close(function() {
				new AC.KBLPGac2nv().init(self.caller, self.callback, self.target);
			});
		});

		this._zd = this._content.find("#zd");
		this._zoomac = this._content.find("#zb1");
		this._zb = this._content.find("#zb");
		this._z2gb = this._content.find("#z2gb");
		this._nvPaquet = this._content.find("#nvPaquet");
		
		this._synth = this._content.find("#synth");
		this._zoomac = this._content.find("#zoomac");
		this._cacherSynth = this._content.find("#cacherSynth");
		this._voirSynth = this._content.find("#voirSynth");
		AC.oncl(this, this._cacherSynth, function(){
			this._z2gb.scrollTop(0);
			this._cacherSynth.css("display", "none");
			this._voirSynth.css("display", "block");
			this._synth.css("display", "none");			
		});
		AC.oncl(this, this._voirSynth, function(){
			this._z2gb.scrollTop(0);
			this._cacherSynth.css("display", "block");
			this._voirSynth.css("display", "none");
			this._synth.css("display", "block");			
		});

		var self = this;
		this.destination = 0;
		this.destination = 2;
		new AC.RadioButton(this, "destinations", AC.KBLPGac2.destinations);
		this._destinations.val(this.destination);
		this._destinations.jqCont.off("dataentry").on("dataentry", function() {
			self.destination = self._destinations.val();
			Util.btnEnable(self._nvPaquet, self.destination < 3);
		});

		new AC.RadioButton(this, "poidsPrix", AC.KBLPGac2.poidsPrix);
		this._poidsPrix.val(this.euro ? 1 : 2);
		this._poidsPrix.jqCont.off("dataentry").on("dataentry", function() {
			self.swEuro(self._poidsPrix.val());
			self.redisplay();
		});
		
		this.registerKB();
		
		this.show();
		
		this.kb = 0;
		this.redisplay();
	},
			
	redisplay : function(kb){
		if (this.kb) {
			if (this.kb == 1) {
				this.val = 0;
				this.kbShow(this.euro ? "e" : "p", false, "SF", this.euro ? "p" : "e", 
						null, AC.SmallScreen.instructionsA);
				this.displayVal();
			} else if (this.kb == 2) {
				this.val = 0;
				this.kbShow(this.euro ? "e" : "p", false, "SF", this.euro ? "p" : "e", 
						"Oups ! ce n'est pas le bon panier", AC.SmallScreen.instructionsA);
				var it = this.items[this.curAc];
				this.displayVal();
				this._kbdiag.html("Panier " + it.label);
			} else if (this.kb == 3) {
				var it = this.items[this.curAc];
				this.val = it.ajuste != -1 ? it.ajuste : (it.qte ? it.qte : 0);
				this.kbShow("q", false, "E", this.euro ? "p" : "e", 
						"Oups ! ce n'est pas le bon panier", AC.SmallScreen.instructionsB);
				this.displayVal();
				this._kbdiag.html("Panier " + it.label);
			} else if (this.kb == 5) {
				this.val = this.nqte;
				this.kbShow("q", false, "E", null, null, AC.SmallScreen.instructionsB);
				this.displayVal();
				this._kbdiag.html("Nombre total de paquets déchargés");
			}
		} else {
			this.kbHide();
			this.compItems();
			this._zd.html(this.etcapoub());
			this._zb.html(this.listac());
			this._synth.html(this.synthese());
			this._zoomac.html(this.aczoom());
			AC.oncl(this, this._zd.find(".acX"), function(target){
				this._z2gb.scrollTop(0);
				this.curAc = Util.dataIndex(target, "code");
				this.redisplay();
			});
			AC.oncl(this, this._zb.find(".acligne"), function(target){
				this._z2gb.scrollTop(0);
				this.curAc = Util.dataIndex(target);
				this.redisplay();
			});
			AC.oncl(this, this._content.find(".pqX"), this.clicPq);
			AC.oncl(this, this._nvPaquet, this.nvPaquet);
			AC.oncl(this, this._zoomac.find("#attribuer"), this.attribuer);
			AC.oncl(this, this._content.find("#qteTotDech"), this.clicQte);
		}
		this.enable();
	},

	nvPaquet : function(){
		this.kb = this.destination == 1 ? 2 : 1;
		this.redisplay(true);
	},
	
	attribuer : function(){
		this.kb = 3;
		this.redisplay(true);
	},
	
	clicQte : function() {
		this.kb = 5;
		this.redisplay(true);
	},

	clicPq : function(target){
		this.curPqIdx = Util.dataIndex(target);
		this.curPqCode = Util.dataIndex(target, "code");
		if (this.destination == 4 && this.curPqCode == -1) {
			this.setDiag("Il n'est pas possible de changer le poids / prix d'un paquet mis à la poubelle");
			return;
		}
		if (this.destination == 4 && this.curPqCode == -2) {
			this.setDiag("Il n'est pas possible de changer le poids / prix d'un paquet resté dans le camion");
			return;
		}
		if (this.destination == 3 && this.curPqCode == -2) {
			this.setDiag("Il n'est pas possible de mettre à la poubelle un paquet resté dans le camion");
			return;
		}
		if (this.destination == 2 && this.curPqCode == 0)
			return; // de étagère vers étagère
		if (this.destination == 1 && this.curPqCode > 0 && this.curPqCode == this.curAc)
			return; // de zoomé vers le même
		if (this.curPqCode == -2)
			this.curItem = this.camionC[this.curPqIdx];
		else if (this.curPqCode == -1)
			this.curItem = this.poubelle[this.curPqIdx];
		else
			this.curItem = this.items[this.curPqCode];
		
		switch (this.destination){
		case 1 :{ // mettre dans le panier
			this.dansPanier();
			break;
		}
		case 2 :{ // mettre sur étagère
			this.surEtagere();
			break;
		}
		case 3 :{ // mettre à la poubelle
			this.dansPoubelle();
			break;
		}
		case 4 :{ // changer prix / poids
			this.kb = 4;
			var p = this.curItem.lpq[this.curPqIdx];
			this.val = this.euro ? p.p : p.k;
			this.kbShow(this.euro ? "e" : "p", false, "E", this.euro ? "p" : "e", 
					null, AC.SmallScreen.instructionsA);
			this.displayVal();
			break;
		}
		}
		if (this.destination != 4)
			this.redisplay();
	},
	
	onVal : function(){
		if (this.kb == 1 || this.kb == 2  || this.kb == 4) {
			if (this.val){
				var p = this.euro ? this.conv.e2p(this.val).res : this.val;
				var pc = Math.round((p * 100) / this.poids);
				var red = pc > 120 || pc < 80 ? "red large bold" : "";
				this._kbdiag.html("<div class='" + red + "'>" + pc + "% du poids moyen</div>");
			} else
				this._kbdiag.html("");
		} 
	},

	onKB : function(key){
		if (key == "S")
			this.addPaquet();
		else  {
			if (key == "F") {
				this.addPaquet();
			} else if (key == "E") {
				if (this.kb == 4)
					this.changePrixPoids();
				else if (this.kb == 5)
					this.changeQteTot();
				else
					this.ajusteQte();
			}
			this.kb = 0;
		}
		this.redisplay();
	},
	
	surEtagere : function(){
		if (this.curPqCode == -2){
			var src = this.camionC[this.curPqIdx];
			this.items['0'].lpq.push({p:src.p, k:src.k, c:true});
		} else if (this.curPqCode == -1){
			var src = this.poubelle[this.curPqIdx];
			this.items['0'].lpq.push({p:src.p, k:src.k, c:true});
			this.poubelle.splice(this.curPqIdx, 1);
		} else {
			var src = this.items[this.curPqCode].lpq[this.curPqIdx];
			this.items['0'].lpq.push({p:src.p, k:src.k, c:true});
			this.items[this.curPqCode].lpq.splice(this.curPqIdx, 1);
		}
	},

	dansPoubelle : function(){
		var src = this.items[this.curPqCode].lpq[this.curPqIdx];
		if (!src.c)
			this.poubelle.push({p:src.p, k:src.k, c:src.c});
		this.items[this.curPqCode].lpq.splice(this.curPqIdx, 1);
	},

	dansPanier : function(){
		if (this.curPqCode == -2){
			var src = this.camionC[this.curPqIdx];
			this.items[this.curAc].lpq.push({p:src.p, k:src.k, c:true});
		} else if (this.curPqCode == -1){
			var src = this.poubelle[this.curPqIdx];
			this.items[this.curAc].lpq.push({p:src.p, k:src.k, c:true});
			this.poubelle.splice(this.curPqIdx, 1);
		} else {
			var src = this.items[this.curPqCode].lpq[this.curPqIdx];
			this.items[this.curAc].lpq.push({p:src.p, k:src.k, c:true});
			this.items[this.curPqCode].lpq.splice(this.curPqIdx, 1);
		}		
	},

	addPaquet : function(){
		if (!this.val)
			return;
		var p = this.euro ? this.val : this.conv.p2e(this.val).res;
		var k = this.euro ? this.conv.e2p(this.val).res : this.val;
		var ac = this.destination == 2 ? 0 : this.curAc;
		this.items[ac].lpq.push({p:p, k:k, c:false});
	},
	
	changePrixPoids : function(){
		var p = this.euro ? this.val : this.conv.p2e(this.val).res;
		var k = this.euro ? this.conv.e2p(this.val).res : this.val;
		var item = this.items[this.curPqCode];
		var pq = item.lpq[this.curPqIdx];
		pq.p = p;
		pq.k = k;
	},
	
	ajusteQte : function(){
		var item = this.items[this.curAc];
		var q = item.qte ? item.qte : 0;
		if (q != this.val)
			item.ajuste = this.val;
		else
			item.ajuste = -1;
	},
	
	changeQteTot : function() {
		this.nqte = this.val;
		this._content.find("#qteTotDech").html("Quantité totale déchargée : " + this.nqte);
	},

	enEdition : function(){
		return this.etagMod || this.nbQteAjustes || this.nbPanMod || this.qte != this.nqte;
	},

	compItems : function() {
		this.nbQteAjustes = 0;
		this.nbQmax = 0;
		this.qteAttr = 0;
		this.nbPanMod = 0;
		this.etagMod = false;
		this.nbPanDistrib = 0;
		this.nbpqEt = 0;
		this.poidsEt = 0;
		this.prixEt = 0;
		this.nbpqPan = 0;
		this.poidsPan = 0;
		this.prixPan = 0;
		this.nbFrust = 0;
		this.nbpqCa = 0;
		this.poidsCa = 0;
		this.prixCa = 0;
				
		var cam = [];
		for (var i = 0, x = 0; x = this.camionI[i]; i++)
			cam.push(x);
		var w = [];
		for(var it in this.items) {
			var ac = parseInt(it, 10);
			var item = this.items[ac];
			item.hasc = false;
			item.lprixN = [];
			for (var i = 0, pq = 0; pq = item.lpq[i]; i++){
				var j = cam.indexOf(pq.p);
				pq.c = j != -1;
				if (pq.c) {
					item.hasc = true;
					cam.splice(j, 1);
				}
				item.lprixN.push(pq.p);
				if (ac) {
					this.nbpqPan++;
					this.poidsPan += pq.k;
					this.prixPan += pq.p;
				} else {
					this.nbpqEt++;
					this.poidsEt += pq.k;
					this.prixEt += pq.p;					
				}
			}
			item.lprixN.sort(AC.Sort.num);
			item.lpc = Util.ArrayEqual(item.lprix, item.lprixN);

			if (ac) {
				if (!item.lpc)
					this.nbPanMod++;
				var qte = item.ajuste != -1 ? item.ajuste : (item.qte ? item.qte : 0);
				this.qteAttr += qte;
				if (item.ajuste != -1)
					this.nbQteAjustes++;
				item.qmax = qte > this.qmax;
				if (item.qmax)
					this.nbQmax++;
				item.frust = item.qteS && qte < item.qteS;
				if (item.frust)
					this.nbFrust++;
				item.distrib = qte != item.lprixN.length;
				if (item.distrib)
					this.nbPanDistrib++;
				item.bottom = ac > 1 && !qte && !item.qteS && !item.lpq.length && item.ajuste == -1;
			} else {
				if (!item.lpc)
					this.etagMod = true;
			}
		}
		cam.sort();
		this.camionC = [];
		for (var i = 0; i < cam.length; i++) {
			var p = cam[i];
//			var k = Math.round((p * 1000) / this.pu);
			var k = this.conv.e2p(p).res;
			this.nbpqCa++;
			this.poidsCa += k;
			this.prixCa += p;
			this.camionC.push({p:p, k:k, c:true});
		}
	},
	
	synthese : function(){
		var sb = new StringBuffer();
		sb.append("<div class='bold moyen inverse'>Synthèse tous paquets</div>");
		sb.append("<div class='acTB1B'>");
		
		var lprix = [];
		for(var it in this.items){
			var item = this.items[it];
			for(j = 0; j < item.lprixN[j]; j++)
				lprix.push(item.lprixN[j] * 1000 + item.code);
		}

		var m = {lprix:lprix}
		
		var edx = new AC.edApPr(this.y.x, m, this.y.pd, this.y.cv, this.reduc);
		
		if (this.y.x.charge) {
			sb.append("<div class='acTR1'>")
				.append("<div class='acTDl acTD1l'>Déclaration de livraison</div>");
			sb.append("<div class='acTDc'>" + edx.qteC() + "</div>");
			sb.append("<div class='acTDc2'>" + edx.prixC() + "</div>")
			.append("<div class='acTDc2'>" + edx.poidsC() + "</div>");
			sb.append("</div>");
		}

		if (this.y.x.lprixC.length) {
			sb.append("<div class='acTR1'>")
			.append("<div class='acTDl acTD1l'>Déclaration des paquets livrés</div>");
			sb.append("<div class='acTDc'>" + edx.lpqc() + "</div>")
			.append("<div class='acTDc2'>" + edx.lpmc() + "</div>")
			.append("<div class='acTDc2'>" + edx.lppc() + "</div>");
			sb.append("</div>");
		}
		
		if (this.y.x.decharge) {
			sb.append("<div class='acTR1'>")
			.append("<div class='acTDl acTD1l'>Déclaration de réception</div>");
			sb.append("<div class='acTDc'>" + edx.qteD() + "</div>")
			.append("<div class='acTDc2'>" + edx.prixD() + "</div>")
			.append("<div class='acTDc2'>" + edx.poidsD() + "</div>");
			sb.append("</div>");
		}

		if (this.camionC.length) {
			sb.append("<div class='acTR1'>")
			.append("<div class='acTDl acTD1l'>Paquets déclarés livrés et NON déclarés reçus</div>");
			sb.append("<div class='acTDc'>" + this.nbpqCa + "</div>")
			.append("<div class='acTDc2'>" + INT.editE(this.prixCa) + "</div>")
			.append("<div class='acTDc2'>" + INT.editKg(this.poidsCa) + "</div>");
			sb.append("</div>");
		}

		if (edx.hasLpd()) {
			sb.append("<div class='acTR1'>")
			.append("<div class='acTDl acTD1l'>Paquets déclarés reçus</div>");
			sb.append("<div class='acTDc'>" + edx.lpqd() + "</div>")
			.append("<div class='acTDc2'>" + edx.lpmd() + "</div>")
			.append("<div class='acTDc2'>" + edx.lppd() + "</div>");
			sb.append("</div>");
		}
	
		var et = this.items['0'];
		if (et.lpq.length) {
			sb.append("<div class='acTR1'>")
			.append("<div class='acTDl acTD1l'>Paquets sur étagère</div>");
			sb.append("<div class='acTDc'>" + this.nbpqEt + "</div>")
			.append("<div class='acTDc2'>" + INT.editE(this.prixEt) + "</div>")
			.append("<div class='acTDc2'>" + INT.editKg(this.poidsEt) + "</div>");
			sb.append("</div>");			
		}

		if (this.nbpqPan) {
			sb.append("<div class='acTR1'>")
			.append("<div class='acTDl acTD1l'>Paquets distribués dans les paniers</div>");
			sb.append("<div class='acTDc'>" + this.nbpqPan + "</div>")
			.append("<div class='acTDc2'>" + INT.editE(this.prixPan) + "</div>")
			.append("<div class='acTDc2'>" + INT.editKg(this.poidsPan) + "</div>");
			sb.append("</div>");			
		}

		sb.append("<div class='acTR1'>")
		.append("<div class='acTDl acTD1l'>Nombre de paquets attribués</div>");
		sb.append("<div class='acTDc'>" + edx.qte() + "</div>")
		.append("<div class='acTDc2'>&nbsp;</div>")
		.append("<div class='acTDc2'>&nbsp;</div>");
		sb.append("</div>");			

		sb.append("<div class='acTR1'>")
		.append("<div class='acTDl acTD1l'>Nombre de paniers modifiés</div>");
		sb.append("<div class='acTDc'>" + this.nbPanMod + "</div>")
		.append("<div class='acTDc2'>&nbsp;</div>")
		.append("<div class='acTDc2'>&nbsp;</div>");
		sb.append("</div>");			

		sb.append("</div>");	
		
		var flags = 0;
		
		if (this.nbFrust)
			flags = flags | AC.Flag.FRUSTRATION;
		
		if (this.nbPanDistrib)
			flags = flags | AC.Flag.PAQUESTAC;
		
		if (this.nbQmax)
			flags = flags | AC.Flag.QMAX;
		
		var nd = this.nbpqEt + this.nbpqPan;
		var pd = this.prixPan + this.prixEt;
		if (this.y.x.decharge && (nd != this.y.x.qteD || (pd < this.y.x.prixD * 0.95)
				|| (pd > this.y.x.prixD * 1.05)))
			flags = flags | AC.Flag.PAQUETSD;
		
		var nc = this.camionI.length;
		var pc = this.prixCaI;
		if (this.y.x.charge && (nc != this.y.x.qteC || (pc < this.y.x.prixC * 0.95)
				|| (pc > this.y.x.prixC * 1.05)))
			flags = flags | AC.Flag.PAQUETSC;
		
		if (this.nbPanDistrib != this.qteAttr)
			flags = flags | AC.Flag.DISTRIB;
		
		if (this.flagsCST | flags)
			sb.append(AC.Flag.print1(this.flagsCST | flags, AC.Flag.ALL, 1));

		return sb.toString();
	},

	aczoom : function(){
		var item = this.items[this.curAc];
		var sb = new StringBuffer();
	
		var m = {lprix: item.lprixN};
		if (item.ajuste != -1)
			m.qte = item.ajuste;
				
		var edx = new AC.edAcApPr(item, m, this.y.pd, this.y.cv, this.reduc);
				
		sb.append("<div class='bold moyen inverse'>Panier courant : " + item.label + "</div><div>");
		
		var lst = [];
		if (item.lpq.length) {
			for(var i = 0, pq = null; pq = item.lpq[i]; i++)
				lst.push({code:item.code, init:null, i:i, pq:pq});
			this.dispPq(sb, lst);
		}

		var qe = !(item.qte === undefined) && item.qte ? item.qte : 0; 
		var qa = item.ajuste != -1 ? item.ajuste : qe; 
		
		sb.append("<div class='acTB1B'>");
		
		if (!(item.qteS === undefined) && item.qteS)
			sb.append("<div class='acTR1'><div class='acTDc4'>" + item.qteS + "</div>"
					+ "<div class='acTDl acTD2l'>Quantité demandée par l'alterconso</div></div>");
		if (qa != qe)
			sb.append("<div class='acTR1'><div class='acTDc4 acModifie'>"
				+ "<span class='barre'>&nbsp;" + qe + "&nbsp;</span>  " + qa + "</div>");
		else 
			sb.append("<div class='acTR1'><div class='acTDc4'>" + qe + "</div>");
		sb.append("<div class='acTDl acTD2l'>Quantité attribuée&nbsp;</div>");
		sb.append("<div id='attribuer' class='action'>Attribuer</div>");
		sb.append("</div>");
		
		sb.append("<div class='acTR1'><div class='acTDc4'>" + edx.lpq() + "</div>");
		sb.append("<div class='acTDl acTD2l'>Nombre de paquets dans le panier</div></div>");
		
		sb.append("<div class='acTR1'><div class='acTDc4'>" + edx.prixL() + "</div>");
		if (edx.srcLp)
			sb.append("<div class='acTDl acTD2l'>Montant des paquets dans le panier</div>");
		else
			sb.append("<div class='acTDl acTD2l'>Montant estimé des paquets à mettre dans le panier</div>");			
		sb.append("</div>");
		
		sb.append("<div class='acTR1'><div class='acTDc4'>" + edx.poidsL() + "</div>");
		if (edx.srcLp)
			sb.append("<div class='acTDl acTD2l'>Poids des paquets dans le panier</div>");
		else
			sb.append("<div class='acTDl acTD2l'>Poids estimé des paquets à mettre dans le panier</div>");			
		sb.append("</div>");
		
		var flags = 0;
		if (item.frust)
			flags = flags | AC.Flag.FRUSTRATION;
		if (item.distrib)
			flags = flags | AC.Flag.PAQUETSAC;
		if (item.qmax)
			flags = flags | AC.Flag.QMAX;
		if (flags)
			sb.append(AC.Flag.print1(flags, AC.Flag.ALL, 0, true));
		sb.append("</div>");
		
		return sb.toString();
	},
	
	itemac : function(item, nb){
		var sb = new StringBuffer();
		sb.append("<div class='trA" + (nb % 2) + " acligne' data-index='" + item.code + "'>");
		sb.append("<div class='tdA acligneid'><div class='acligneidlb'>" + item.label.escapeHTML() + "</div></div>");
		sb.append("<div class='tdB talc6'>");
		if (item.frust)
			sb.append(AC.Flag.img(AC.Flag.FRUSTRATION));
		if (item.distrib)
			sb.append(AC.Flag.img(AC.Flag.PAQUETSAC));
		if (item.qmax)
			sb.append(AC.Flag.img(AC.Flag.QMAX));
		if (!item.frust && !item.distrib && !item.qmax)
			sb.append("&nbsp;");
		sb.append("</div>");
		
		var qe = !(item.qte === undefined) && item.qte ? item.qte : 0; 
		var qa = item.ajuste != -1 ? item.ajuste : qe;
				
		sb.append("<div class='tdC talc6" + (qa != qe ? " acModifie'>" : "'>"));
		if (qa != qe)
			sb.append("<span class='barre'>&nbsp;" + qe + "&nbsp;</span>&nbsp;" + "<b>" + qa + "</b>");
		else
			sb.append(qe);
		sb.append("&nbsp;/&nbsp;" + item.lpq.length + "</div>");
		sb.append("</div>");
		return sb.toString();
	},
	
	listac : function(sb){
		var sb = new StringBuffer();
		sb.append("<div class='tableA'>");
		var nb = 0;
		for (var i = 0, ac = 0; ac = this.allAc[i]; i++){
			var item = this.items[ac];
			if (!item.bottom)
				sb.append(this.itemac(item, nb++));
		}
		for (var i = 0, ac = 0; ac = this.allAc[i]; i++){
			var item = this.items[ac];
			if (item.bottom)
				sb.append(this.itemac(item, nb++));
		}
		sb.append("</div>");
		sb.append("<div class='filler'></div>");
		return sb.toString();
	},
	
	paquet : function(code, pq, idx, init){
		var rw = "pqX";
		if (pq.c)
			rw += " italic";
		var sb = new StringBuffer();
		if (init != null)
			sb.append("<div class='pqXacX'>");
		sb.append("<div class='" + rw + "' data-code='" + code + "' data-index='" + idx + "'>");
		if (this.euro)
			sb.append(INT.editE(pq.p));
		else
			sb.append(INT.editKg(pq.k));
		sb.append("</div>");
		if (init)
			sb.append("<div class='acX' data-code='" + code + "'>" + init + "</div>");
		else
			sb.append(" ");
		if (init != null)
			sb.append("</div>");
		return sb.toString();
	},
	
	sort1 : function(a, b){
		var pa = a.pq.p;
		var pb = b.pq.p;
		if (pa < pb) return -1;
		return pa > pb ? 1 : 0;
	},
	
	dispPq : function(sb, lst){
		lst.sort(this.sort1);
		if (lst.length)
			for(var i = 0, x = null; x = lst[i]; i++)
				sb.append(this.paquet(x.code, x.pq, x.i, x.init));		
	},
	
	etcapoub : function() {
		var sb = new StringBuffer();
		var lst = [];
		sb.append("<div class='inverse bold moyen talc' style='margin-top:3.5rem;'>Camion</div>");
		if (this.camionC.length) {
			for(var i = 0, pq = null; pq = this.camionC[i]; i++)
				lst.push({code:-2, init:"", i:i, pq:pq});
			this.dispPq(sb,lst);
		}
		lst = [];
		sb.append("<div class='inverse bold moyen talc acSpace05'>Poubelle</div>");
		if (this.poubelle.length) {
			for(var i = 0, pq = null; pq = this.poubelle[i]; i++)
				lst.push({code:-1, init:"", i:i, pq:pq});
			this.dispPq(sb,lst);	
		}
		lst = [];
		sb.append("<div class='inverse bold moyen talc acSpace05'>Etagère</div>");
		var et = this.items['0'];
		if (et.lpq.length) {
			for(var i = 0, pq = null; pq = et.lpq[i]; i++)
				lst.push({code:0, init:"", i:i, pq:pq});
			this.dispPq(sb,lst);
		}
		lst = [];
		sb.append("<div class='inverse bold moyen talc acSpace05'>Attribués</div>");
		for(var j = 0, code = 0; code = this.allAc[j]; j++) {
			var item = this.items[code];
			if (item.lpq.length)
				for(var i = 0, pq = null; pq = item.lpq[i]; i++)
					lst.push({code:code, init:item.initiales, i:i, pq:pq});
		}
		this.dispPq(sb,lst);
		sb.append("<div class='filler'></div>");
		return sb.toString();
	},
			
	enregistrer : function(){
		var arg = {op:"45"};
		arg.gap = this.caller.cellGap.code;
		arg.gac = this.caller.cellGac.code;
		arg.codeLivr = this.caller.lv.livr.codeLivr;
		arg.lprix = [];
		arg.prod = this.prod;
		if (this.qte != this.nqte)
			arg.qte = this.nqte;
		var lcdac = [];
		for(var it in this.items){
			var item = this.items[it];
			for(j = 0; j < item.lprixN[j]; j++)
				arg.lprix.push(item.lprixN[j] * 1000 + item.code);
			if (item.ajuste != -1)
				lcdac.push({qte:item.ajuste, ac:item.code});
		}
		if (lcdac.length != 0)
			arg.lcdac = lcdac;
		arg.operation = "Mise à jour des paquets reçus ou distribués et quantités ajustées";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Mise à jour faite");
			this.close();
		}, function(data) {
			AC.Message.info("Echec de la mise à jour des paquets déchargés ou distribués et quantités ajustées");
		});	
	}
	
}
AC.declare(AC.KBLPGac2, AC.SmallScreen);

/****************************************************************/

AC.KBLPGac2nv = function(){}
AC.KBLPGac2nv._static = {
		help : "<br><h2 id=='KBLPGac2nv'>Saisir les poids des paquets déchargés du camion</h2>"
			+ "<p style='color:red;'>Après une série de saisies ne pas oublier d'appuyer sur le bouton <b>Vailder</b> en haut.</p>"
			+ "<b>Le nombre de paquets déchargés</b> est à renseigner avec le nombre total de paquets sortis du camion."
			+ "<p><b>Le nombre de paquets saisis</b> correspond au nombre total de paquets ayant un poids/prix et, "
			+ "<br>&nbsp;&nbsp;a) soit attribué au panier d'un alterconso, <br>&nbsp;&nbsp;b) soit en attente d'attribution sur l'étagère."
			+ "<p>Le nombre de paquets commandés est la somme des nombres des paquets commandés pour chaque alterconso apparaissant dans "
			+ "la liste en bas. <br>"
			+ "Un animateur peut toujours corriger la quantité demandée par l'alterconso, à la hausse comme à la baisse. "
			+ "Lors du déchargement en fonction du nombre effectif de paquets déchargés, "
			+ "on peut l'augmenter par le bouton + ou la diminuer par le bouton - de chaque alterconso.<br>"
			+ "Quand des quantités ont été corrigées, la somme des corrections à la hausse et la somme des corrections à la baisse"
			+ " figurent en orange à côté du total commandé."
			+ "<p>Il est possible d'attribuer un ou des paquets à un alterconso qui n'en n'avait pas demandés :<br>"
			+ "&nbsp;&nbsp;a) cliquer sur la ligne <b>Ajouter un alterconso n'ayant pas commandé</b><br>"
			+ "&nbsp;&nbsp;b) sélectionner l'alterconso de la liste en cliquant dessus,<br>"
			+ "&nbsp;&nbsp;c) <b>appuyer sur le bouton + de sa ligne</b> autant de fois que de paquets à lui attribuer."
			+ "<p>Normalement à la fin de la saisie les nombres de paquets <b>déchargés, saisis et commandés</b> doivent être égaux (ce qui allume le smiley heureux)."
			+ "<br><span style='color:red;'>Si pour un alterconso une quantité en rouge apparaît en tête de ligne, il FAUT ajuster "
			+ "sa quantité attribuée par + ou - ou lui enlever / ajouter des paquets.<br>Quand un alterconso a une quantité commandée Q et AUCUN PAQUET attribué, "
			+ "il reste facturé par ESTIMATION de Q PAQUETS au poids FORFAITAIRE.</span>"
			+ "<h3>Saisis au chargement par le producteur</h3>"
			+ "Il arrive que la liste des paquets soit présaisie <b>au chargement du camion</b>. C'est rare mais c'est agréable "
			+ "car ça raccourcit d'autant la saisie des poids/prix au déchargement. Dans ce cas ces paquets apparaissent dans cette zone d'où ils "
			+ "peuvent être coupés/collés (mais non modifiés). Les paquets saisis au chargement ont un cadre bleu plutôt que noir (juste pour information)."
			+ "<h3>Ajouter des paquets</h3>"
			+ "On peut en ajouter, a) soit sur l'étagère, b) soit sur un alterconso, en cliquant sur un paquet vide portant la mention "
			+ "<b>saisie €/Kg cliquer ici</b>. On peut en ajouter plusieurs à la suite en cliquant sur <b>Suivant</b> plutôt que sur "
			+ "<b>Fin</b> dans la boîte de dialogue.<br>"
			+ "<i>Remarque :</i> si sur une ligne d'un alterconso il n'apparaît pas de paquet vide c'est que son panier est complet. On peut toutefois toujours appuyer sur le bouton + pour en faire apparaître un."
			+ "<h3>Modifier le poids d'un paquet déjà saisi</h3>"
			+ "Cliquer sur le paquet et choisir l'option <b>Modifier le prix/poids du paquet</b> puis saisir la valeur correcte. Si le paquet avait été présaisi au chargement du camion, la valeur présaisie "
			+ "revient sur la ligne en haut et la nouvelle valeur apparaît là où on l'a cliqué initialement."
			+ "<h3>Couper / Coller</h3>"
			+ "On peut couper un paquet n'importe où en cliquant dessus puis on le colle en cliquant sur l'une des cases vides marquées "
			+ "<b>COLLER ICI</b>. On peut aussi coller un paquet dans la poubelle : c'est <i>comme si</i> on le détruisait sauf qu'il est possible de le "
			+ "repêcher en cas d'erreur et éviter de le ressaisir."
			+ "<h3>Tout est bon quand ...</h3>"
			+ "Pour chaque alterconso quand il n'y a pas de chiffre en rouge en tête de sa ligne : le nombre de paquets mis dans son panier correspond à ce qu'il avait "
			+ "commandé (ou que l'animateur a forcé).<br>"
			+ "Globalement quand il n'y a pas de panier d'alterconso trop rempli (plus de paquets mis dans le panier que commandés) "
			+ "ou incomplet (moins de paquets mis dans le panier que commandés) et que le nombre de paquets saisis, déchargés et commandés sont égaux.<br>"
			+ "<i>Remarque :</i> il ne doit pas rester au final de paquets sur l'étagère. <br>Il peut apparaître sur la "
			+ "première ligne des paquets saisis au chargement et qui n'ont pas été trouvés au déchargement. " 
			+ "Ceci peut provenir, <br>&nbsp;&nbsp;a) d'une perte de paquets ou d'un paquet d'un autre groupe mis par erreur ici, <br>&nbsp;&nbsp;b) soit d'une différence "
			+ "d'arrondi : un autre paquet de prix presque identique à 1 ou 2 centimes près a été saisi au lieu de celui saisi au chargment."
			+ "<h3>Trucs et astuces</h3>"
			+ "Permuter deux paquets entre deux alterconsos demande d'en mettre un provisoirement sur l'étagère (donc 3 couper/coller, soit 6 clics).<br>"
			+ "Il y a ceux qui mettent tous les paquets sur l'étagère au cul du camion puis les affectent plus tard.<br>"
			+ "Il y a ceux qui les attribuent tout de suite aux alterconsos au cul du camion en collant un postit avec les initiales marquées au feutre.<br>"
			+ "Il y a ceux qui font moitié l'un moitié l'autre et d'autres encore plus créatifs !<br>"
			+ "<b>La bonne méthode est ... celle que vous aimez le mieux !</b><br><br>"

}
AC.KBLPGac2nv._proto = {
	className: "KBLPGac2nv",
	
	init : function(caller, callback, target){
		AC.KBLPGac2.prefNV = true;
		this.caller = caller;
		this.callback = callback;
		this.target = target;
		
		var lc = this.caller.lv.cellLivrC;

		this.prod = Util.dataIndex(target);
		this.ap = Math.floor(this.prod / 10000);
		this.pr = this.prod % 10000;

		this.gap = this.caller.lv.cellGap.code;
		this.cellGac = this.caller.lv.cellGac;
		this.phase = this.caller.lv.slivr.phase;

		this.gap_prod = this.gap + "_" + this.prod;
		this.euro = !AC.ac2.euro[this.gap_prod];

		this.val = 0;
		var y = null;
		for(var i = 0, x = null; x = this.caller.lv.bdl[i]; i++)
			if (x.pd.prod == this.prod) { y = x; break;	}
		if (!y) {
			this.callback.call(this.caller);
			return;
		}
		
		var lprixC = y.x.lprixC;
		// lprixC = [823000, 1097000, 900000, 1100000]; // TEST
		var lprix = y.x.lprix;
		this.qteD = y.x.decharge ? y.x.qteD : 0;
		this.nqteD = this.qteD;
		this.nbic = 0;
		this.nbtr = 0;
		
		this.conv = new AC.Conv(y.pd, y.cv, lc.reduc);
		this.poids = y.cv.poids;

		this.poubelle = [];
		this.allAc = [];
		this.lpq = [];
		this.lpqLibre = [];
		this.items = {
			camion:{initiales:"", code:-1, label:"Paquets saisis au chargement par le producteur", 
				status:2, lpq:[], lprix:[], lprixN:[]},
			poubelle:{initiales:"", code:-1, label:"Paquets mis à la poubelle", 
				status:2, lpq:[], lprix:[], lprixN:[]},
			etagere:{initiales:"", code:0, label:"Paquets sur l'étagère, saisis au déchargement par les animateurs", 
				status:2, lpq:[], lprix:[], lprixN:[]},
		}
		// le paquet 0 est spécial : toujours sur étagère et toujours vide
		this.items.etagere.lpq.push(this.getVide(0));
		
		for (var i = 0, x = 0; x = lprixC[i]; i++) {
			var p = Math.floor(x / 1000);
			var k = this.conv.e2p(p).res;
			var idx = this.lpq.length;
			var pq = {idx:idx, p:p, k:this.conv.e2p(p).res, cam:true, attrib:-1}
			this.lpq.push(pq);
			this.items.camion.lpq.push(idx);
		}		
			
		var lst = this.cellGac.getContacts();
		var temp = [];
		for(var i = 0, e = null; e = lst[i]; i++) {
			if (e.suppr) continue;
			var x = lc.getAcApPr(false, e.code, this.ap, this.pr);
			var t = {initiales:e.initiales, code:e.code, label:e.oc, 
					status: x ? x.status : 0, ajuste:-1, lpq:[], lprix:[], lprixN:[], qte:0, qteS:0};
			if (x && x.status == 2){
				t.qte = x.qte;
				t.qteS = x.qteS;
				if (t.qte || t.qteS) t.vis = true;
			}
			temp.push({initiales:e.initiales, code:e.code});
			this.items[e.code] = t;
		}
		temp.sort(AC.Sort.gac);
		for(var i = 0, x = null; x = temp[i]; i++)
			this.allAc.push(x.code);

		for (var i = 0, x = 0; x = lprix[i]; i++) {
			var p = Math.floor(x / 1000);
			var ac = x % 1000;
			var k = this.conv.e2p(p).res;
			var idx = this.pqCam(p);
			var pq;
			if (idx == -1) {
				idx = this.lpq.length;
				pq = {idx:idx, p:p, k:this.conv.e2p(p).res, attrib:ac};
				this.lpq.push(pq);
			} else
				this.lpq[idx].attrib = ac;
			var it = ac ? this.items[ac] : this.items.etagere;
			it.lpq.push(idx);
			it.lprix.push(p);
			it.lprixN.push(p);
		}
				
		for(var i = 0, c = 0; c = this.allAc[i]; i++){
			var it = this.items[c];
			if (!it.vis) continue;
			var diff = it.qte - it.lpq.length;
			if (diff > 0)
				for(var j = 0; j < diff; j++)
					it.lpq.push(this.getVide(it.code));
		}
		
		this.listAcVisible = false;
		this.idxCut = -1;	
		this.tempPoub = -1;
		
		var sb = new StringBuffer();		
		this.keyboard(sb, false);
		
		sb.append("<div id='ntop' class='maFonteA'><div id='ntopl1'><div id='ntopl1s' class='ntophap'></div>");
		sb.append("Paquets déchargés:<div id='ntopl1dc'></div>saisis:<div id='ntopl1sa'></div>");
		sb.append("commandés:<div id='ntopl1co'></div></div>");
		sb.append("<div id='ntopl3'><div id='ntopl3s' class='ntophap'></div>");
		sb.append("Paniers incomplets:<div id='ntopl3ic'></div>");
		sb.append("trop remplis:<div id='ntopl3tr'></div></div>");
		sb.append("<div id='ntopl2'><div id='ntopl2i' class='ntopl2i ntopl2v'></div>Ajouter un alterconso n\'ayant pas commandé</div>");
		sb.append("<div id='ntopl2ac'></div>");
		sb.append("</div>");
		sb.append("<div id='nbot'></div>");
		sb.append("<div id='ntopmask'><div id='ntopavis3'>Annuler</div><div id='ntopavis2'>Modifier le prix/poids du paquet</div>"
				+ "Cliquer sur le paquet à coller</div>");
		
		var nv = "Version classique : cliquer ici";
		AC.SmallScreen.prototype.init.call(this, -800, sb.toString(), "Valider", true, 
				y.pd.nom.escapeHTML() + "<br>Détail des paquets", nv);
		this._content.css("overflow-y", "hidden");
		this._content.css("margin-top", "0");
		this._content.parent().find("#filler").css("display", "none");

		AC.oncl(this, this._cartouche, function(){
			var self = this;
			this.close(function() {
				new AC.KBLPGac2().init(self.caller, self.callback, self.target, self.options);
			});
		});

		this._ntop = this._content.find("#ntop");
		this._nbot = this._content.find("#nbot");
		this._ntopmask = this._content.find("#ntopmask");
		this._ntopavis2 = this._content.find("#ntopavis2");
		this._ntopavis3 = this._content.find("#ntopavis3");
		
		this._ntopl1dc = this._ntop.find("#ntopl1dc");
		this._ntopl1co = this._ntop.find("#ntopl1co");
		this._ntopl1sa = this._ntop.find("#ntopl1sa");
		this._ntopl3ic = this._ntop.find("#ntopl3ic");
		this._ntopl3tr = this._ntop.find("#ntopl3tr");
		this._ntopl1s = this._ntop.find("#ntopl1s");
		this._ntopl3s = this._ntop.find("#ntopl3s");
		this._ntopl2 = this._ntop.find("#ntopl2");
		this._ntopl2i = this._ntop.find("#ntopl2i");
		this._ntopl2ac = this._content.find("#ntopl2ac");
		AC.oncl(this, this._ntopl2, function(){
			if (this.listAcVisible) 
				this.hideLstAc();
			else 
				this.showLstAc();
		});
		AC.oncl(this, this._ntopl1dc, function() {
			this.kb = 1;
			this.val = this.nqteD;
			this.kbShow("q", false, "E", null, null, AC.SmallScreen.instructionsB);
			this.displayVal();
			this._kbdiag.html("Nombre total de paquets déchargés");
		});
		AC.oncl(this, this._ntopavis2, function() {
			this._ntopmask.css("display", "none");
			this.clicpq(this.idxCut);
		});
		AC.oncl(this, this._ntopavis3, function() {
			this.idxCut = -1;
			if (this.tempPoub != -1) {
				this.freeVide(this.tempPoub);
				this.items.poubelle.lpq.splice(0, 1);
			}
			this.redisplayBot();
			this.redisplayTop();
		});

		this.registerKB();
		
		this.show();
		
		this.kb = 0;
		this.redisplayBot();
		this.redisplayTop();
	},
	
	clicpq : function(idx) {
		var pq = this.lpq[idx];
		this.idxEdit = idx;
		this.idxCut = -1;
		if (this.tempPoub != -1) {
			this.freeVide(this.tempPoub);
			this.items.poubelle.lpq.splice(0, 1);
		}
		this.kb = 2;
		this.val = this.euro ? pq.p : pq.k;
		this.kbShow(this.euro ? "e" : "p", false, "SF", this.euro ? "p" : "e", 
				null, AC.SmallScreen.instructionsA);
		this.displayVal();
		if (pq.attrib == -1 || pq.attrib == 0)
			this._kbdiag.html("Paquet pour l'étagère");
		else {
			var it = this.items[pq.attrib];
			this._kbdiag.html("Paquet pour " + it.initiales + " - " + it.label);
		}
	},
	
	pqCam : function(p){
		var lpq = this.items.camion.lpq;
		var x = -1;
		var idx = -1;
		for(var i = 0; i < lpq.length; i++) {
			idx = lpq[i];
			var pq = this.lpq[idx];
			if (pq.p == p && pq.attrib == -1) {	x = i; break; }
		}
		if (x != -1) {
			this.items.camion.lpq.splice(x, 1);
			return idx;
		}
		return -1;
	},
	
	showLstAc : function() {
		var sb = new StringBuffer();
		for(var i = 0, c = 0; c = this.allAc[i]; i++){
			var t = this.items[c];
			if (t.vis) continue;
			sb.append("<div class='ntopit' data-index='" + c + "'><span class='ntopitc'>" + t.initiales +
				"</span><span class='ntopicl'>" + t.label + "</span></div>");
		}
		this._ntopl2ac.html(sb.toString());
		this.listAcVisible = true;
		this._ntop.css("height", "100%");
		this._nbot.css("display", "none");
		this._ntopl2ac.css("display", "block");
		this._ntopl2i.removeClass("ntopl2v");
		this._ntopl2i.addClass("ntopl2nv");
		AC.oncl(this, this._ntopl2ac.find(".ntopit"), function(target){
			var ac = Util.dataIndex(target);
			this.items[ac].vis = true;
			this.redisplayBot();
			this.hideLstAc();
		})
	},
	
	hideLstAc : function() {
		this.listAcVisible = false;
		this._nbot.css("display", "block");
		this._ntopl2ac.css("display", "none");
		this._ntopl2i.removeClass("ntopl2nv");
		this._ntopl2i.addClass("ntopl2v");
		this._ntop.css("height", "9rem");
	},
			
	redisplayTop : function() {
		var saisis = 0;
		var comm = 0;
		var pqt = 0;
		var mqt = 0;
		for(var ac in this.items){
			var it = this.items[ac];
			if (it.code < 0 || (!it.vis && it.code)) continue;
			saisis += it.lprixN.length;
			if (it.code)
				comm += it.q;
			if (it.qteS < it.q)
				pqt += (it.q - it.qteS);
			else if (it.qteS > it.q)
				mqt += (it.qteS - it.q);
		}
		var x = comm;
		if (pqt || mqt) {
			x += "<span class='orange'>&nbsp;[";
			if (pqt) x+= "+" + pqt;
			if (pqt && mqt) x+= "&nbsp;";
			if (mqt) x += "-" + mqt;
			x += "]</span>";
		}
		this._ntopl1dc.html(this.nqteD);
		this._ntopl1co.html(x);
		this._ntopl1sa.html(saisis);	
		this._ntopl3ic.html(this.nbic);	
		this._ntopl3tr.html(this.nbtr);	
		if (this.nqteD == saisis && comm == saisis) {
			this._ntopl1s.removeClass("ntopsad");
			this._ntopl1s.addClass("ntophap");
		} else {
			this._ntopl1s.removeClass("ntophap");
			this._ntopl1s.addClass("ntopsad");
		}
		if (this.nbic || this.nbtr) {
			this._ntopl3s.addClass("ntopsad");
			this._ntopl3s.removeClass("ntophap");
		} else {
			this._ntopl3s.addClass("ntophap");
			this._ntopl3s.removeClass("ntopsad");
		}
		this._ntopmask.css("display", this.idxCut != -1 ? "block" : "none");
		this.enable();
	},
		
	onVal : function(){
		if (this.kb == 2) {
			if (this.val){
				var p = this.euro ? this.conv.e2p(this.val).res : this.val;
				var pc = Math.round((p * 100) / this.poids);
				var red = pc > 120 || pc < 80 ? "red large bold" : "";
				this._kbdiag.html("<div class='" + red + "'>" + pc + "% du poids moyen</div>");
			} else
				this._kbdiag.html("");
		} 
	},

	onKB : function(key){
		if (key == "E" && this.kb == 1) {
			this.nqteD = this.val;
			this.kb = 0;
			this.kbHide();
			this.redisplayTop();
			return;
		}
		if (key == "S") {
			this.setPaquet(false);
			return;
		}
		if (key == "F")
			this.setPaquet(true);
		this.kb = 0;
		this.kbHide();
		this.redisplayBot();
		this.redisplayTop();
	},

	enEdition : function(){
		return this.items.etagere.diff || this.nbQteAjustes || this.nbAcMod || this.qteD != this.nqteD;
	},

	valueOfItem : function(it) {
		var t = 0;
		for(var i = 0; i < it.lpq.length; i++)
			t += this.lpq[it.lpq[i]].p;
		return "&nbsp;&nbsp;<i>" + INT.editE(t) + "</i>";
	},
	
	redisplayBot : function() {
		this.nbic = 0;
		this.nbtr = 0;
		this.nbQteAjustes = 0;
		this.nbAcMod = 0;
		var sb = new StringBuffer();		
		sb.append("<div class='nbotfiller'></div>");
		
		if (this.items.camion.lpq.length){
			var v = this.valueOfItem(this.items.camion);
			sb.append("<div class='nbotz'><div class='nbotzt'>" + this.items.camion.label + v + "</div><div class='nbotzt2'>");
			for(var i = 0; i < this.items.camion.lpq.length; i++)
				this.editPq1(sb, this.items.camion.lpq[i]);
			sb.append("</div></div>");
		}

		var v = this.valueOfItem(this.items.poubelle);
		sb.append("<div class='nbotz'><div class='nbotzt'>" + this.items.poubelle.label + v + "</div><div class='nbotzt2'>");
		if (this.idxCut != -1 && this.lpq[this.idxCut].attrib >= 0) {
			this.tempPoub = this.getVide(-2);
			this.items.poubelle.lpq.push(this.tempPoub);
		}
		for(var i = 0; i < this.items.poubelle.lpq.length; i++)
			this.editPq1(sb, this.items.poubelle.lpq[i]);
		sb.append("</div></div>");

		var v = this.valueOfItem(this.items.etagere);
		var it = this.items.etagere;
		var cl = it.diff ? "nbotzt nbotztch" : "nbotzt";
		sb.append("<div class='nbotz'><div class='" + cl + "'>" + it.label + v + "</div><div class='nbotzt2'>");
		for(var i = 0; i < it.lpq.length; i++)
			this.editPq1(sb, it.lpq[i]);
		sb.append("</div></div>");
		
		for(var ac in this.items){
			if (ac == "0") continue;
			var it = this.items[ac];
			if (it.vis) {
				it.q = it.ajuste != -1 ? it.ajuste : it.qte;
				var v = this.valueOfItem(it);
				if (it.q && !it.lprixN.length)
					v += "<span class='red bold'>&nbsp;-&nbsp;PRIX ESTIMÉ</span>";
				if (it.ajuste != -1) this.nbQteAjustes++;
				if (it.diff) this.nbAcMod++;
				var cl = it.q != it.qte || it.diff ? "nbotzt nbotztch" : "nbotzt";
				it.nbq = 0;
				for(var i = 0; i < it.lpq.length; i++)
					if (this.lpq[it.lpq[i]].p) it.nbq++;
				sb.append("<div class='nbotz'><div class='" + cl + "'><b>" + it.initiales + "</b>&nbsp;&nbsp;-&nbsp;&nbsp;" 
						+ it.label + v + "</div><div class='nbotzt2'>");
				var delta = it.nbq - it.q;
				if (delta) {
					if (delta > 0)
						this.nbtr++;
					else
						this.nbic++;
					var x = (delta > 0 ? "+" : "") + delta;
					sb.append("<div class='nbotdelta'>" + x + "</div>");
				}
				sb.append("<div class='nbotpq2" + (this.idxCut == -1 ? "'" : " ui-disabled'") + " data-index='" + ac + "'>");
				sb.append("<div class='nbotpqmoins'>-</div>");
				sb.append("<div class='nbotpqqte'>");
				if (it.q != it.qteS) {
					sb.append("<div class='nbotpqbarre'>" + it.qteS + "</div>");
					sb.append("<div class='nbotpqred'>" + it.q + "</div>");
				} else
					sb.append("<div class='nbotpqstd'>" + it.qte + "</div>");
				sb.append("</div><div class='nbotpqplus'>+</div></div>");

				for(var i = 0; i < it.lpq.length; i++)
					this.editPq1(sb, it.lpq[i]);
				sb.append("</div></div></div>");
			}
		}

		this._nbot.html(sb.toString());
		AC.oncl(this, this._nbot.find(".nbotpqmoins"), function(target){
			var ac = Util.dataIndex(target);
			if (this.moins1(ac)) {
				this.redisplayBot();
				this.redisplayTop();			
			};
		});
		AC.oncl(this, this._nbot.find(".nbotpqplus"), function(target){
			var ac = Util.dataIndex(target);
			this.plus1(ac);
			this.redisplayBot();
			this.redisplayTop();
		});
		AC.oncl(this, this._nbot.find(".nbotpq"), function(target){
			this.idxCut = Util.dataIndex(target);
			this.kb = 1;
			this.redisplayBot();
			this.redisplayTop();
		});
		AC.oncl(this, this._nbot.find(".nbotpqvide"), function(target){
			var idx = Util.dataIndex(target);
			this.clicpq(idx);
		});
		AC.oncl(this, this._nbot.find(".nbotpqplus"), function(target){
			var ac = Util.dataIndex(target);
			this.plus1(ac);
			this.redisplayBot();
			this.redisplayTop();
		});
		if (this.idxCut != -1){
			AC.oncl(this, this._nbot.find(".nbotcoller"), function(target){
				this.coller(Util.dataIndex(target));
				this.redisplayBot();
				this.redisplayTop();
			});				
		}
	},
	
	getVide : function(ac) {
		var idx;
		if (this.lpqLibre.length < 1) {
			idx = this.lpq.length;
			this.lpq.push({idx:idx, p:0, k:0, attrib:ac});
		} else {
			idx = this.lpqLibre.shift();
			this.lpq[idx].attrib = ac;
		}
		return idx;
	},
	
	freeVide : function(idx) {
		var pq = this.lpq[idx];
		pq.p = 0;
		pq.k = 0;
		pq.attrib = -3;
		pq.cam = false;
		this.lpqLibre.push(idx);
	},
	
	coller : function(idx) {
		var src = this.lpq[this.idxCut];
		if (idx == 0) {
			// special de l'étagère : on lui ajoute le vide virtuellement cliqué pour coller
			idx = this.getVide(0);
			this.items.etagere.lpq.push(idx);
		}
		
		var dest = this.lpq[idx];
		var tempToDel = dest.attrib != -2 && this.tempPoub != -1 ? 1 : 0;
		if (dest.attrib == -2 && src.cam) {
			// mise à la poubelle d'un paquet du camion (ne venait pas du camion)
			// on le remet dans le camion
			dest.attrib = -1;
			this.items.camion.lpq.push(idx); // camion n'avait pas de template vide
			tempToDel = 2;
		}
		
		dest.p = src.p;
		dest.k = src.k;
		if (src.cam)
			dest.cam = true;
		if (dest.attrib >= 0) {
			var itd = this.itemOf(dest.attrib);
			itd.lprixN.push(src.p);
			itd.diff = !Util.SortedArrayEqual(itd.lprix, itd.lprixN);
		}
		
		var it = this.itemOf(src.attrib);
		var i = it.lpq.indexOf(this.idxCut);
		if (i != -1) it.lpq.splice(i, 1);
		if (src.attrib >= 0) {
			var j = it.lprixN.indexOf(src.p);
			if (j != -1) it.lprixN.splice(j, 1);
			it.diff = !Util.SortedArrayEqual(it.lprix, it.lprixN);
			if (src.attrib) {
				var qx = it.ajuste != -1 ? it.ajuste : it.qte;
				if (qx > it.lpq.length)
					it.lpq.push(this.getVide(it.code));
			}
		}
		
		if (tempToDel) {
			if (tempToDel == 1)
				this.freeVide(this.tempPoub);
			this.items.poubelle.lpq.splice(0, 1);
		}
		this.idxCut = -1;
		this.tempPoub = -1;
	},
	
	itemOf : function(attrib){
		if (attrib == -1)
			return this.items.camion;
		if (attrib == -2)
			return this.items.poubelle;
		if (attrib == 0)
			return this.items.etagere;
		return this.items[attrib];
	},
	
	moins1 : function(ac) {
		var it = this.items[ac];
		if (!it.q) return false;
		/* on cherche un paquet vide depuis la fin
		 * si trouvé on le rend
		 */
		var idx = -1;
		var pq = null;
		var x = -1;
		for(var i = it.lpq.length -1; i >= 0; i--){
			idx = it.lpq[i];
			pq = this.lpq[idx];
			if (!pq.p) {
				x = i;
				break;
			}
		}
		if (x != -1){
			it.lpq.splice(i, 1);
			this.freeVide(idx);
		} else {
			x = it.lpq.length -1;
			idx = it.lpq[x];
			it.lpq.splice(x, 1);
			pq = this.lpq[idx];
			var j = it.lprixN.indexOf(pq.p);
			if (j != -1) it.lprixN.splice(j, 1);
			it.diff = !Util.SortedArrayEqual(it.lprix, it.lprixN);

			if (pq.cam) {
				pq.attrib = -1;
				this.items.camion.lpq.push(idx);
			} else {
				var itd = this.items.etagere;
				pq.attrib = 0;
				itd.lpq.push(idx);
				itd.lprixN.push(pq.p);
				itd.diff = !Util.SortedArrayEqual(itd.lprix, itd.lprixN);
			}
		}
		if (it.ajuste != -1) {
			it.ajuste--;
			if (it.ajuste == it.qte)
				it.ajuste = -1;
		} else
			it.ajuste = it.qte - 1;
		return true;
	},

	plus1 : function(ac) {
		var it = this.items[ac];
		if (it.ajuste == -1)
			it.ajuste = it.qte + 1;
		else
			it.ajuste++;
		if (it.ajuste > it.lpq.length)
			it.lpq.push(this.getVide(ac));
	},

	editPq1 : function(sb, idx) { // coupable pas editable
		var pq = this.lpq[idx];
		if (pq.p) {
			var cl = this.idxCut == -1 ? "" : ((this.idxCut == idx ? " nboty" : " ") + " ui-disabled");
			if (pq.cam) cl += " nbotpqcam";
			sb.append("<div class='nbotpq" + cl + "' data-index='" + pq.idx + "'>");
			sb.append("<div>" + INT.editE(pq.p) + "</div>");
			sb.append("<div>" + INT.editKg(pq.k) + "</div>");
			sb.append("</div>");
		} else {
			if (this.idxCut == -1) {
				sb.append("<div class='nbotpq' data-index='" + pq.idx + "'>");
				sb.append("<div class='nbotpqvide'>saisie €/Kg<br>cliquer ici</div></div>");
			} else {
				if (this.lpq[this.idxCut].attrib == pq.attrib) {
					sb.append("<div class='nbotpq ui-disabled' data-index='" + pq.idx + "'>");
					sb.append("<div class='nbotpqvide'>saisie €/Kg<br>cliquer ici</div></div>");
				} else {
					sb.append("<div class='nbotpq' data-index='" + pq.idx + "'>");
					sb.append("<div class='nbotpqvide nbotcoller'>Coller<br>ici</div></div>");
				}
			}
		}
	},
		
	setPaquet : function(fin){
		if (fin && !this.val) {
			if (this.idxEdit) {
				// Pas l'étagère - faut-il supprimer le dernier vide ajouté
				var pq = this.lpq[this.idxEdit];
				var it = this.itemOf(pq.attrib);
				if (pq.p){
					// c'était un vide
					if (it.lpq.length > it.q) {
						var i = it.lpq.indexOf(this.idxEdit);
						if (i != -1) it.lpq.splice(i, 1);
						this.freeVide(this.idxEdit);
					}
				}
			}
			this.idxEdit = -1;
			return;
		}
		if (!this.idxEdit) {
			// special de l'étagère
			this.idxEdit = this.getVide(0);
			this.items.etagere.lpq.push(this.idxEdit);
		}
		var pq = this.lpq[this.idxEdit];
		var p = this.euro ? this.val : this.conv.p2e(this.val).res;
		var k = this.euro ? this.conv.e2p(this.val).res : this.val;
		var it = this.itemOf(pq.attrib);			

		if (pq.p != p) {
			if (pq.cam) {
				// on ne modifie pas un paquet du camion. 
				if (pq.attrib == -1) {
					// il venait du camion. On fait comme si ça venait de l'étagère
					var idx2 = this.getVide(0);
					pq = this.lpq[idx2];
					it = this.items.etagere;
					it.lpq.push(idx2);
				} else {
					//On le remet dans le camion
					pq.attrib = -1;
					this.items.camion.lpq.push(this.idxEdit);
					// on fait comme si on avait saisi un déjà sais mais pas du camion
					var idx2 = this.getVide(it.code);
					var pq2 = this.lpq[idx2];
					pq2.p = pq.p;
					pq2.k = pq.k;
					var kx = it.lpq.indexOf(this.idxEdit);
					if (kx != -1) it.lpq.splice(kx, 1, idx2);
					pq = pq2;
				}
			}
			if (pq.p) {
				var j = it.lprixN.indexOf(pq.p);
				if (j != -1) it.lprixN.splice(j, 1);
			}
			pq.p = p;
			pq.k = k;
			it.lprixN.push(pq.p);
			it.diff = !Util.SortedArrayEqual(it.lprix, it.lprixN);
		}
		if (fin) {
			this.idxEdit = -1;
			return;
		}
		if (!pq.attrib) {
			// c'est l'étagère
			this.clicpq(0);
			return;
		}
		// on cherche un vide sur la ligne
		var idx = -1;
		var pq = null;
		var x = -1;
		for(var i = it.lpq.length -1; i >= 0; i--){
			idx = it.lpq[i];
			pq = this.lpq[idx];
			if (!pq.p) {
				x = i;
				break;
			}
		}
		if (x == -1) { // pas trouvé on en met un
			idx = this.getVide(it.code);
			it.lpq.push(idx);
		}
		this.clicpq(idx);
	},
					
	onVal : function(){
		if (this.kb == 2) {
			if (this.val){
				var p = this.euro ? this.conv.e2p(this.val).res : this.val;
				var pc = Math.round((p * 100) / this.poids);
				var red = pc > 120 || pc < 80 ? "red large bold" : "";
				this._kbdiag.html("<div class='" + red + "'>" + pc + "% du poids moyen</div>");
			} else
				this._kbdiag.html("");
		} 
	},

	enregistrer : function(){
		var arg = {op:"45"};
		arg.gap = this.caller.cellGap.code;
		arg.gac = this.caller.cellGac.code;
		arg.codeLivr = this.caller.lv.livr.codeLivr;
		arg.lprix = [];
		arg.prod = this.prod;
		if (this.qte != this.nqte)
			arg.qte = this.nqte;
		var lcdac = [];
		for(var it in this.items){
			var item = this.items[it];
			if (item.code < 0) continue;
			for(j = 0; j < item.lprixN[j]; j++)
				arg.lprix.push(item.lprixN[j] * 1000 + item.code);
			if (item.code > 0 && item.ajuste != -1)
				lcdac.push({qte:item.ajuste, ac:item.code});
		}
		if (lcdac.length != 0)
			arg.lcdac = lcdac;
		arg.operation = "Mise à jour des paquets reçus ou distribués et quantités ajustées";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Mise à jour faite");
			this.close();
		}, function(data) {
			AC.Message.info("Echec de la mise à jour des paquets déchargés ou distribués et quantités ajustées");
		});	
	}
	
}
AC.declare(AC.KBLPGac2nv, AC.SmallScreen);

/****************************************************************/
AC.KBLPGap = function(){}
AC.KBLPGap._static = {	
	mask1 : AC.Flag.NONCHARGE,
	
	mask2 : AC.Flag.EXCESTR | AC.Flag.PERTETR,

	poidsPrix : [{code: 1, label:"PRIX en euros"},
	             {code: 2, label:"POIDS en Kg"}]
}
AC.KBLPGap._proto = {
	className: "KBLPGap",
	
	init : function(caller, callback, target){
		this.mode = 2;
		this.target = target;
		this.prod = Util.dataIndex(target);
		this.callback = callback;
		this.caller = caller;
		this.gap = this.caller.lv.cellGap.code;
		this.cellGac = this.caller.lv.cellGac;
		this.phase = this.caller.lv.slivr.phase;
		this.gap_prod = this.gap + "_" + this.prod;
		this.euro = !AC.ac2.euro[this.gap_prod];

		var lc = this.caller.lv.cellLivrC;
		this.lc = lc;
		this.reduc = this.lc.reduc;
		var ap = Math.floor(this.prod / 10000);
		var pr = this.prod % 10000;

		this.val = 0;
		this.y = null;
		for(var i = 0, y = null; y = this.caller.lv.bdl[i]; i++){
			if (y.pd.prod == this.prod) {
				this.y = y;
				break;
			}
		}
		if (!this.y) {
			this.callback.call(this.caller);
			return;
		}
		this.conv = new AC.Conv(this.y.pd, this.y.cv, lc.reduc);
		this.poids = y.cv.poids;
		this.pd = this.y.pd;
		
		this.flagsCST = y.x.flags & (this.phase < 3 ? AC.KBLPGap.mask1 : AC.KBLPGap.mask1 | AC.KBLPGap.mask2);
		this.curpq = -1;
		
		this.lprix = [];
		this.lprixC = [];
		this.nbPaquetsC = this.y.x.lprixC.length;
		for (var i = 0, x = 0; x = this.y.x.lprix[i]; i++)
			this.lprix.push(Math.floor(x / 1000));
		for (var i = 0, x = 0; x = this.y.x.lprixC[i]; i++){
			var p = Math.floor(x / 1000);
			var k = this.conv.e2p(p).res;
			// st: 0:nouveau, 1:origine, 2:suppr
			this.lprixC.push({p:p, k:k, tri:p, st:1, etagere:false});
		}
		
		var x = this.y.x;
		this.qteTR = x && !(x.qte === undefined) ? x.qte : 0;
		this.poidsTR = x && !(x.poids === undefined) ? x.poids : 0;
		this.hasTR = false;
		if (x && x.charge) {
			this.qteTR = x.qteC;
			this.poidsTR = x.poidsC;
			this.hasTR = true;
		}

		AC.SmallScreen.prototype.init.call(this, -800, this.paint(), "Valider", true, 
				this.y.pd.nom.escapeHTML() + "<br>Détail des paquets");
		this.register();
		this.show();
		this.displayEtagere();
	},
		
	displaySynth : function(){
		var x = this.y.x;
		var sb = new StringBuffer();
		if (sb.isEmpty){
			sb.append("<div class='large'>Quand le paquet comporte le prix ET le poids, <b>TOUJOURS saisir le PRIX</b><br></div>"),
			sb.append("<div>Pour supprimer un paquet, cliquer sur la croix rouge à droite du paquet</div>");
			sb.append("<div>Pour changer le poids / prix d'un paquet, cliquer sur son poids / prix à gauche du paquet</div>");
		}
		var m = {lprixC: []}
		var poidsPaquetsC = 0;
		for (var i = 0, z = null; z = this.lprixC[i]; i++) {
			if (z.st != 2) {
				poidsPaquetsC += z.p;
				m.lprixC.push((z.p * 1000) + 1000);
			}
		}
		
		var nbPaquetsC = m.lprixC.length;
		
		sb.append("<div class='acTB1B'>");
		this.caller.displaySynthCD(sb, this.y, m);
		sb.append("</div>");
		
		var flags = 0;
		
		if (this.y.x.charge && (nbPaquetsC != this.y.x.qteC || (poidsPaquetsC < this.poidsTR * 0.95)
				|| (poidsPaquetsC > this.poidsTR * 1.05)))
			flags = flags | AC.Flag.PAQUETSC;
		
		if (this.flagsCST | flags)
			sb.append(AC.Flag.print1(this.flagsCST | flags, AC.Flag.ALL, 1));

		this._zh.html(sb.toString());
	},
		
	displayPq : function(sb, mode, i, x){ // mode 0:dech NON ch, 1:ch ET dech, 2:ch NON dech
		var nv = mode && x.changed ? " bgyellow" : "";
		if (mode == 0) {
			sb.append("<div class='pqE" + nv + "' data-index='-" + i + "'>");
//			var v = this.euro ? x : Math.round((x * 1000) / this.pu);
			var v = this.euro ? x : this.conv.e2p(x).res;
			sb.append("<div class='fixed pqP'>" + this.editVal(v) + "</div>");
		} else {
			sb.append("<div class='pqE" + nv + "' data-index='" + i + "'>");
			if (x.st == 2)
				var z3 = " barre'>";
			else
				var z3 = "'>";
			sb.append("<div class='fixed pqP" + nv + z3 + this.editVal(x) + "</div>");		
			if (x.st != 2)
				sb.append("<div class='pqICS'></div>");
		}
		sb.append("</div>");
	},
	
	displayEtagere : function(){
		this.etagereR = [];
		this.nbetagere = 0;
		this.nbchanged = 0;
		for (var i = 0, x = 0; x = this.lprix[i]; i++)
			this.etagereR.push(x);
		var w = [];
		for (var i = 0, x = 0; x = this.lprixC[i]; i++){
			var j = this.etagereR.indexOf(x.p);
			if (x.st != 2) {
				x.etagere = (j != -1);
				if (x.etagere)
					this.etagereR.splice(j, 1);
			}
			x.changed = x.st != 1;
			if (x.changed)
				this.nbchanged++;
			if (x.etagere)
				this.nbetagere++;
		}
		this.etagereR.sort(AC.Sort.num);
		this.lprixC.sort(AC.Sort.t);
		
		var sb = new StringBuffer();
		if (this.etagereR.length != 0) {
			sb.append("<div class='acSpace2 bold italic underlined'>Paquets déclarés reçus mais NON déclarés livrés : " + this.etagereR.length + "</div>");
			for (var i = 0, x = 0; x = this.etagereR[i]; i++)
				this.displayPq(sb, 0, x, x);
		}
		var dnc = sb.toString();

		var sb = new StringBuffer();
		var nx = this.lprixC.length - this.nbetagere;
		if (nx) {
			sb.append("<div class='acSpace2 bold italic underlined'>Paquets déclarés livrés mais PAS (encore?) déclarés reçus  : " 
					+ nx + "</div>");
			for (var i = 0, x = 0; x = this.lprixC[i]; i++)
				if (!x.etagere)
					this.displayPq(sb, 1, i, x);
		}
		var cnd = sb.toString();
		
		var sb = new StringBuffer();
		if (this.nbetagere){
			sb.append("<div class='acSpace2 bold italic underlined'>Paquets déclarés livrés ET reçus : " 
					+ this.nbetagere + "</div>");
			for (var i = 0, x = 0; x = this.lprixC[i]; i++)
				if (x.etagere)
					this.displayPq(sb, 2, i, x);
		}
		var ced = sb.toString();
		
		this._paquets.html(cnd + ced + dnc);
		
		AC.oncl(this, this._paquets.find(".pqICS"), this.clickICS);
		AC.oncl(this, this._paquets.find(".pqP"), this.clickP);

		this.displaySynth();

		this.enable();
	},
		
	editVal : function(val){
		var sz = this.euro ? 2 : 3;
		var v = "" + (typeof val == "number" ? val : (this.euro ? val.p : val.k));
		if (v.length <= sz)
			return "0." + "000".substring(0, (sz - v.length)) + v;
		else
			return v.substring(0, v.length - sz) + "," + v.substring(v.length - sz, v.length);
	},
	
	onVal : function(){
		if (this.mode == 1) {
			if (this.val){
//				var p = this.euro ? Math.round((this.val * 1000) / this.pu) : this.val;
				var p = this.euro ? this.conv.e2p(this.val).res : this.val;
				var pc = Math.round((p * 100) / this.poids);
				var red = pc > 120 || pc < 80 ? "red large bold" : "";
				this._kbdiag.html("<div class='" + red + "'>" + pc + "% du poids moyen</div>");
			} else
				this._kbdiag.html("");
		} 
		if (this.mode == 3) {
		
		}
	},
		
	paint : function(){
		var sb = new StringBuffer();
		this.keyboard(sb, false);
		if (this.mode == 1)
			Util.btnEnable(this._keyboard.find(".kbcellSuiv"), (this.curpq == -1));
		sb.append("<div class='opt2'><div data-ac-id='poidsPrix'></div></div>");
		sb.append("<div id='pqNV' class='action pqNV'>Ajouter paquet(s)</div>");

		sb.append("<div id='zh' class='zh2'></div>");
		sb.append("<div class='zb2'><div id='paquets'></div></div>");
		return sb.toString();
	},
	
	repaint : function(){
		this._content.html(this.paint());
		this.register();
		this.displayEtagere();
		if (this.mode != 2)
			this.displayVal();
	},
	
	onKB : function(key){
		if (key == "S")
			this.addPaquet(false);
		else if (key == "F")
			this.addPaquet(true);
	},
		
	register : function(){
		new AC.RadioButton(this, "poidsPrix", AC.KBLPGap.poidsPrix);
		this._poidsPrix.val(this.euro ? 1 : 2);
		var self = this;
		this._poidsPrix.jqCont.off("dataentry").on("dataentry", function() {
			self.swEuro(self._poidsPrix.val());
			if (self.mode == 1)
				self.displayVal();
			self.displayEtagere();
		});
		
		this.registerKB();
		AC.oncl(this, this._content.find("#pqNV"), this.clickNV);
		this._zh = this._content.find("#zh");
		this._paquets = this._content.find("#paquets");
		
		if (this.mode == 1) {
			this.kbShow(this.euro ? "e" : "p", false, "SF", this.euro ? "p" : "e");
		} else {
			this.kbHide();
		}
	},
	
	addPaquet : function(fin) {
//		var p = this.euro ? this.val : Math.round(this.val * this.pu / 1000);
//		var k = this.euro ? Math.round(this.val * 1000 / this.pu) : this.val;
		var p = this.euro ? this.val : this.conv.p2e(this.val).res;
		var k = this.euro ? this.conv.e2p(this.val).res : this.val;
		this.val = 0;
		if (this.curpq == -1) {
			if (p != 0)
				this.lprixC.push({p:p, k:k, tri:p, st:0});
			if (fin) {
				this.mode = 0;
				this.repaint();
			} else {
				this.displayVal();
				this.displayEtagere();			
			}
		} else {
			if (p != 0) {
				var pq = this.lprixC[this.curpq];
				if (pq.st == 0){
					pq.p = p;
					pq.k = k;
					tri = p;
				} else {
					this.lprixC.push({p:p, k:k, tri:p, st:0});
					pq.st = 2;
				}
			}
			this.mode = 0;
			this.repaint();
			this.curpq = -1;
		}
	},

	clickICS : function(target) {
		var i = Util.dataIndex(target);
		var pq = this.lprixC[i];
		if (pq.st == 0)
			this.lprixC.splice(i, 1);
		else
			pq.st = 2;
		this.displayEtagere();
	},

	clickP : function(target) {
		var p = Util.dataIndex(target);
		if (p < 0) {
			p = -p;
//			var k = Math.round((p * 1000) / this.pu);
			var k = this.conv.e2p(p).res;
			this.lprixC.push({p:p, k:k, tri:p, st:0});
			this.mode = 0;
			this.repaint();
		} else {
			this.curpq = p;
			var pq = this.lprixC[this.curpq];
			if (pq.st == 2){
				pq.st = 1;
				this.displayEtagere();
			} else {
				this.val = this.euro ? pq.p : pq.k;
				this.mode = 1;
				this.repaint();
			}
		}
	},

	clickNV: function(){
		this.curpq = -1;
		this.val = 0;
		this.mode = 1;
		this.repaint();		
	},
	
	enEdition : function(){
		return this.nbchanged > 0;
	},
	
	enregistrer : function(){
		var arg = {op:"45"};
		arg.gap = this.caller.cellGap.code;
		arg.gac = this.caller.cellGac.code;
		arg.codeLivr = this.caller.lv.slivr.codeLivr;
		arg.lprix = [];
		arg.prod = this.prod;
		for(var i = 0, x = null; x = this.lprixC[i]; i++){
			if (x.st == 2)
				continue;
			arg.lprix.push(x.p * 1000);
		}
		arg.operation = "Mise à jour des paquets livrés";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Mise à jour faite");
			this.close();
		}, function(data) {
			AC.Message.info("Echec de la mise à jour des paquets livrés");
		});	
	}
	
}
AC.declare(AC.KBLPGap, AC.SmallScreen);

/****************************************************************/
AC.KBJustif = function(){}
AC.KBJustif._static = {}
AC.KBJustif._proto = {
	className : "KBJustif",
	
	init : function(caller, target){
		this.target = target;
		this.caller = caller;
		this.ap = Util.dataIndex(target);
		this.cellLivrC = this.caller.livrC;
		this.cellGap = this.cellLivrC.cellGap
		var eltAp = this.cellGap.get(this.ap);
		var xAp = this.cellLivrC.getAp(false, this.ap);
		if (xAp.db){
			var lib = "<br>Justification du débit de " + INT.editE(xAp.db);
		} else if (xAp.cr){
			var lib = "<br>Justification du crédit de " + INT.editE(xAp.cr);
		} else {
			var lib = "<br>Dernière justification d'un débit / crédit désormais annulé";
		}
		this.descrB = xAp.descr;
		var sb = new StringBuffer();
		sb.append("<div class='acSpace2'></div>"
				+ "<div class='acLabel'>Justification et mode de régularisation proposé</div>"
				+ "<div class='acEntry'><textarea id='justif'></textarea></div>");

		AC.SmallScreen.prototype.init.call(this, 650, sb.toString(), "Valider", true, 
				eltAp.nom.escapeHTML() + lib);
		this.show();
		this._justif = this._content.find("#justif");
		this._justif.val(this.descrB);
		this.enable();
		var self = this;
		this._justif.off(APP.KEYUP).on(APP.KEYUP, function(event){
			APP.NOPROPAG(event);
			self.enable();
		});
	},
	
	enEdition : function() {
		return this._justif.val() != this.descrB;
	},
	
	enErreur : function() {
		return false;
	},
		
	enregistrer : function() {
		var descr = this._justif.val();
		var arg = {op:"44"};
		arg.gap = this.cellGap.code;
		arg.codeLivr = this.cellLivrC.codeLivr;
		arg.apr = this.ap;
		arg.gac = this.cellLivrC.cellGac.code;
		arg.descr = descr ? descr : "";
		arg.operation = "Déclaration / modification d'une justification de débit / crédit";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Enregistrement fait");
			this.close();
		}, "Echec de l'enregistrement : ");
	}
	
}
AC.declare(AC.KBJustif, AC.SmallScreen);

/************************************************************/
AC.Paiement2 = function(){}
AC.Paiement2._static = {
	html : "<div class='acsTabs acsTabBar'><div class='acTab2 acsTabX acsTabSel bold' data-ac-id='itab1' data-index='1'>" 
		+ "Chèque / avoir / supplément"
		+ "</div><div class='acTab2 acsTabX bold'  data-ac-id='itab2' data-index='2'>"
		+ "Paiement POUR ou PAR un ami"
		+ "</div></div>"
		
		+ "<div id='diag' class='kbdiagb'></div>"

		+ "<div class='acsTabBodyb'>"
		
		+ "<div data-ac-id='tab1'>"
		+ "<div class='acLabel'><div>Montant du chèque</div>"
		+ "<div data-ac-id='chequeEd'></div></div><div class='acEntry'>"
		+ "<input data-ac-id='cheque' type='text'></input></div>"

		+ "<div class='acLabel'>Facultatif : intitulé du compte, ou tout commentaire à propos du chèque</div><div class='acEntry'>"
		+ "<textarea data-ac-id='intitule'></textarea></div>"

		+ "<div class='acSpace1' data-ac-id='signe'></div>"
		
		+ "<div class='acLabel'><div>Montant du supplément ou de l'avoir / remboursement</div>"
		+ "<div data-ac-id='supplEd'></div></div><div class='acEntry'>"
		+ "<input data-ac-id='suppl' type='text'></input></div>"
		
		
		+ "<div class='acLabel'>Justification / calcul de ce supplément / avoir</div><div class='acEntry'>"
		+ "<textarea data-ac-id='descr'></textarea></div>"
		+ "<div data-ac-id='valider' class='acBtnValider1'>Enregistrer</div>"

		+ "</div><div data-ac-id='tab2'>"

		+ "<div class='acLabel'>Sélectionner un Alterconso ami </div><div class='acEntry'>"
		+ "<div class='acdd-box italic' data-ac-id='selectAmi'>(aucun)</div></div>"
		+ "<div data-ac-id='infoAmi' class='bold' style='min-height:2rem'></div>"
		+ "<div class='acLabel'><div>Montant </div>"
		+ "<div data-ac-id='payeParPourEd'></div></div><div class='acEntry'>"
		+ "<input data-ac-id='payeParPour' type='text'></input></div>"
		+ "<div data-ac-id='payerPour' class='acBtnValider1b'>Payer POUR cet ami</div><br>"
		+ "<div data-ac-id='payerPar' class='acBtnValider1b'>Etre payé PAR cet ami</div>"
		+ "</div>"

		+ "</div>"

}
AC.Paiement2._proto = {
	className : "Paiement2",
	
	init : function(caller, target){
		this.target = target;
		this.caller = caller;
		this.ac = Util.dataIndex(target, "ac");
		this.ap = Util.dataIndex(target, "ap");
		this.gap = Util.dataIndex(target, "gap");
		this.lv = this.caller.listLivr[this.gap];
		this.codeLivr = this.lv.slivr.codeLivr;
		this.x = this.lv.cellLivrC.getAcAp(true, this.ac, this.ap);
		this.eltAp = this.lv.cellGap.get(this.ap);
		this.gac = APP.Ctx.loginGac.code;
		this.eltAc = APP.Ctx.loginGac.get(this.ac);
		this.initAc = this.eltAc.initiales;
		
		var ti = "Paiement de [" + this.eltAc.initiales + "] " + this.eltAc.nom.escapeHTML() 
			+ "<br> à [" + this.eltAp.initiales + "] " + this.eltAp.nom.escapeHTML();
		AC.SmallScreen.prototype.init.call(this, 800, AC.Paiement2.html, null, true, ti);
		
		this._content.css("overflow-y", "hidden");
		this._content.css("position", "relative");
		
		this._tab1 = APP.id(this, "tab1");
		this._tab2 = APP.id(this, "tab2");
		this._itab1 = APP.id(this, "itab1");
		this._itab2 = APP.id(this, "itab2");
		this.tabi = 1;
		this._tab2.css("display", "none");
		this.y = {payeParPour:null, ami:0};

		this._infoAmi = APP.id(this, "infoAmi");
		this._diag = this._content.find("#diag");
		this.register();
		this.show();
		AC.oncl(this, this._content.find(".acTab2"), function(target){
			this.tabi = Util.dataIndex(target);
			this.MC.begin().resetEdit("x", "y").commit();
			var j = this.tabi == 1 ? 2 : 1;
			this["_tab" + this.tabi].css("display", "block");
			this["_itab" + this.tabi].addClass("acsTabSel");
			this["_tab" + j].css("display", "none");
			this["_itab" + j].removeClass("acsTabSel");
		});
	},
			
	setInfoAmi : function(ami){
		if (!ami) {
			this._infoAmi.html("");
			return;
		}
		
		var y = this.lv.cellLivrC.getAcAp(true, ami, this.ap);
		var yy = " Ni créditeur, ni débiteur";
		if (y.regltFait) {
			if (y.cr)
				yy = " Créditeur de " + INT.editE(y.cr);
			else if (y.db)
					yy = " Débiteur de " + INT.editE(y.db);
		} else if (y.prix || y.prixPG)
			yy = " Débiteur de " + INT.editE(y.prix + y.prixPG);
			
		var amiPour = 0;
		var amiPar = 0;
		for(var i = 0, z = null; z = this.x.lstPour[i]; i++)
			if (z.ac == ami)
				amiPour = z.m;
		for(var i = 0, z = null; z = this.x.lstPar[i]; i++)
			if (z.ac == ami)
				amiPar = z.m;
		var initAmi = APP.Ctx.loginGac.get(ami).initiales;
		if (!amiPour && !amiPar) {
			this._infoAmi.html("Aucun paiement POUR ou PAR cet ami n'est enregistré. " + yy);
			return;
		}
		if (amiPour)
			this._infoAmi.html("Un paiement PAR [" + this.initAc + "] de " + INT.editE(amiPour) 
					+ " est enregistré POUR [" + initAmi + "]. " + yy);
		else
			this._infoAmi.html("Un paiement PAR [" + initAmi + "] de " + INT.editE(amiPar) 
					+ " est enregistré POUR [" + this.initAc + "]. " + yy);			
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
	
	enEdition : function() {
		return this.MC.val("edited");
	},

	enErreur : function() {
		return this.MC.val("error");
	},

	register : function(){
		var self = this;
		var cellGac = APP.Ctx.loginGac;
		var ac = this.ac;
		var decor1 = cellGac.decor("<div class='acdd-itemValue color16 bold'>(personne)</div>", function(elt) {
			return elt.code != ac ? elt.initiales : null;}, true);
		new AC.Selector3(this, "selectAmi", decor1, true);

		new AC.CheckBox2(this, "signe", "C'est un <span class='red'>avoir / remboursement</span> et non un supplément");

		var mc = new AC.MC("AC.Paiement", this);
		mc.addVar("cheque", "x", function(v){
			if (v != null && typeof v != "number" || v < 0)
				return "Montant du chèque : nombre mal formé";
			return null;
		});
		mc.addVar("absSuppl", "x", function(v){
			if (v != null && typeof v != "number" || v < 0)
				return "Montant avoir / remboursement : nombre mal formé";
			return null;
		});
		mc.addVar("supDescr", "x").addVar("signe", "x").addVar("intitule", "x");
		mc.addHtml("valider", this.enregistrer);

		mc.addVar("payeParPour", "y", function(v){
			if (v != null && typeof v != "number" || v < 0)
				return "Montant payé par / pour : nombre mal formé";
			return null;
		});
		mc.addVar("ami", "y", function(v){
			self.setInfoAmi(v);
			return null;
		});
		
		mc.addHtml("payerPour", function(){
			self.payerParPour(true);
		});
		mc.addHtml("payerPar", function(){
			self.payerParPour(false);
		});
		mc.addExpr(0, {e : "edited", x : "error", a : "ami", p: "payeParPour", v:"_payerPour"}, 
			"var b = e && !x && a && p != null; Util.btnEnable(v,b)");
		mc.addExpr(0, {e : "edited", x : "error", a : "ami", p: "payeParPour", v:"_payerPar"}, 
			"var b = e && !x && a && p != null; Util.btnEnable(v,b)");
		
		mc.addExpr(0, {x : "error"}, "this.setDiag(x)");
		mc.addExpr(0, {e : "edited", x : "error", v:"_valider"}, 
			"var b = e && !x; Util.btnEnable(v,b)");
		mc.addInput("cheque", "cheque", null, INT.editD2, INT.Str2N2);
		mc.addInput("payeParPour", "payeParPour", null, INT.editD2, INT.Str2N2);
		mc.addInput("suppl", "absSuppl", null, INT.editD2, INT.Str2N2);
		mc.addInput("descr", "supDescr");
		mc.addInput("intitule", "intitule");
		mc.addRich("signe", "signe");
		mc.addRich("selectAmi", "ami");

		mc.addExpr(0, {n:"absSuppl", v:"_supplEd"}, "Util.html(v, INT.editE(n))");
		mc.addExpr(0, {n:"cheque", v:"_chequeEd"}, "Util.html(v, INT.editE(n))");
		mc.addExpr(0, {n:"payeParPour", v:"_payeParPourEd"}, "Util.html(v, INT.editE(n))");

		mc.checkAll(this.checkAll);
		
		this.x.absSuppl = this.x.suppl < 0 ? -this.x.suppl : this.x.suppl;
		this.x.signe = this.x.suppl < 0 ? true : false;
		
		this.MC.begin().sync("x", this.x).sync("y", this.y).commit();
	},
		
	checkAll : function(){
		if (this.tabi == 2) {
			var payeParPour = this.MC.valEd("payeParPour");
			var ami = this.MC.val("ami");
			if (payeParPour != null && !ami)
				return "Une part est payée PAR ou POUR un ami mais celui-ci n'est pas désigné";
			if (payeParPour == null && ami)
				return "Une part est payée PAR ou POUR un ami mais le montant n'est pas indiqué";
		} else {
			var descr = this.MC.val("supDescr");
			var suppl = this.MC.val("absSuppl");
			if (suppl && !descr)
				return "Une description / justification du montant du supplément / avoir est requise";
			if (!suppl && descr)
				return "Une description / justification du montant du "
				+ "supplément / avoir est donnée mais pas le montant lui-même";
		}
	},
	
	enregistrer : function() {
		var arg = {op:"48"};
		arg.gap = this.gap;
		arg.codeLivr = this.codeLivr;
		arg.apr = this.ap;
		arg.gac = this.gac;
		arg.ac = this.ac;
		var descr = this.MC.valEd("supDescr");
		var intitule = this.MC.valEd("intitule");
		var cheque = this.MC.valEd("cheque");
		var absSupplEd = this.MC.valEd("absSuppl");
		var absSuppl = this.MC.val("absSuppl");
		absSuppl = absSuppl ? absSuppl : 0;
		var signe = this.MC.val("signe");
		var signeEd = this.MC.valEd("signe");
		
		if (cheque != null)
			arg.cheque = cheque;
		if (absSupplEd != null || signeEd != null)
			arg.suppl = signe ? -absSuppl : absSuppl;
		if (descr != null)
			arg.descr = descr;
		if (intitule != null)
			arg.intitule = intitule;
		arg.operation = "Déclaration d'un paiement";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Enregistrement fait");
			this.close();
		}, "Echec de l'enregistrement : ");
	},
	
	payerParPour : function(pour) {
		var arg = {op:"49"};
		arg.gap = this.gap;
		arg.codeLivr = this.codeLivr;
		arg.apr = this.ap;
		arg.gac = this.gac;
		arg.ac = this.ac;
		arg.payeParPour = this.MC.valEd("payeParPour");
		arg.ami = this.MC.valEd("ami");
		arg.pour = pour ? 1 : 0;
		arg.operation = "Déclaration d'un paiement POUR / PAR un ami";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Enregistrement fait");
			this.close();
		}, "Echec de l'enregistrement : ");
	}

}
AC.declare(AC.Paiement2, AC.SmallScreen);

/****************************************************************/
AC.Info = function(){}
AC.Info._static = {}
AC.Info._proto = {
	className : "Info",
	
	init : function(caller, target, opt){
		this.target = target;
		this.caller = caller;
		var prod = Util.dataIndex(target);
		this.y = null;
		this.phase = this.caller.lv.slivr.phase;
		for(var i = 0, y = null; y = this.caller.lv.bdl[i]; i++){
			if (y.pd.prod == prod) {
				this.y = y;
				break;
			}
		}
		if (!this.y)
			return;
		
		var sb = new StringBuffer();
		sb.append("<div class='acTB1B'>")
		this.caller.displaySynthCD(sb, this.y, null);
		sb.append("</div>");
		sb.append(AC.Flag.print1(this.y.x.flags, AC.Flag.ALL, opt));

		var ti = "<br>Information à propos des compteurs et alertes";
		AC.SmallScreen.prototype.init.call(this, 650, sb.toString(), null, true, 
				this.y.pd.nom.escapeHTML() + ti);
		this.show();
	}

}
AC.declare(AC.Info, AC.SmallScreen);

/**************************************************************/
AC.InputText = function(){}
AC.InputText._static = {
	html : "<div class='acInputInner'><input class='acInput bold' type='text'/>"
		+ "<div id='acInputInfo' class='acInputDiv'><b>Entrée</b> pour valider<br><b>Echap</b> pour sortir sans valider<br></div>"
		+ "<div id='acInputDiag' class='acInputDiv'>&nbsp;</div></div>"
}
AC.InputText._proto = {
	className : "Input",
	
	init : function(target){
		if (!AC.InputText._screen)
			AC.InputText._screen = $("#smallscreen");
		AC.InputText._screen.html(AC.InputText.html);
		this._content = AC.InputText._screen.find(".acInputInner");
		this._info = this._content.find("#acInputInfo");
		this._kbdiag = this._content.find("#acInputDiag");
		this._input = this._content.find(".acInput");
		var offset = target.offset();
		var posY = offset.top - $(window).scrollTop();
		var posX = offset.left - $(window).scrollLeft();
		this._content.css("top", "" + posY + "px");
		this._content.css("left", "" + posX + "px");
		this._content.css("display", "block");
		AC.InputText._screen.css("display", "block");
		var self = this;
		this._input.focus();
		this._input.off(APP.KEYUP).on(APP.KEYUP, function(event){
			APP.NOPROPAG(event);
			self.onKeyUp(event);
		});
		AC.oncl(this, AC.InputText._screen, function(){
			this.close();
		});
	},
	
	displayVal : function(){
		this._input.val(this.val);
	},
	
	onKeyUp : function(event){
		if (event.keyCode == 13)
			this.onKB("E");
		else if (event.keyCode == 27)
			this.onKB("X");
		else {
			this.val = this._input.val();
			this.onVal();
		}
	},
	
	onKB : function(key) {},
	
	onVal : function() {},	
	
	close : function(){
		AC.InputText._screen.off(APP.CLICK);
		this._content.css("display", "none");
		AC.InputText._screen.css("display", "none");
	}
}
AC.declare(AC.InputText);

/**************************************************************/
AC.KBQVInput = function(){}
AC.KBQVInput._static = {
	mask1 : AC.Flag.PARITE | AC.Flag.PAQUETSC | AC.Flag.NONCHARGE,
		
	mask2 : AC.Flag.DISTRIB | AC.Flag.EXCESTR | AC.Flag.PERTETR | AC.Flag.PAQUETSD,
}
AC.KBQVInput._proto = {
	className : "KBQVInput",
	
	init : function(caller, target){
		this.val = 0;
		this.target = target;
		var prod = Util.dataIndex(target);
		this.caller = caller;
		this.y = null;
		this.phase = this.caller.lv.slivr.phase;
		this.ac = this.caller.ac;
		for(var i = 0, y = null; y = this.caller.lvAc.bdl[i]; i++){
			if (y.pd.prod == prod) {
				this.y = y;
				break;
			}
		}
		if (!this.y)
			return;
		
		this.parDemi = this.y.pd.parDemi;
		this.qmax = this.y.cv.qmax;
		this.qmaxr = this.parDemi ? this.qmax * 2 : this.qmax;
		
		this.qi = y.acApPr ? y.acApPr.qte : 0;
		this.val = this.parDemi ? INT.demi(this.qi) : this.qi;
		this.value = this.qi;
		var ti = APP.Ctx.authUsr ? "<br>Quantité souhaitée" : "<br>Quantité attribuée";
		AC.InputText.prototype.init.call(this, target);
		this.displayVal();
		this.onVal();
	},
	
	onVal : function(){
		var s = "" + this.val;
		var n = this.parDemi ? INT.Str2N(1, s) : INT.Str2N(0, s);
		if (n == -1) {
			this._kbdiag.html("<span class='red bold'>Valeur incorrecte</span>");
			this.value = -1;
			return;
		}
		this.value = this.parDemi ? Math.round(n / 5) : n;
		if (this.value <= this.qmaxr)
			this._kbdiag.html("<span class='vert'>Le seuil d'alerte est fixé à " + this.qmax +"</span>");
		else
			this._kbdiag.html("<span class='orange bold'>Le seuil d'alerte est fixé à " + this.qmax +"</span>");
	},
		
	enEdition : function(){
		return this.qi != this.value;
	},
	
	onKB : function(key){
		if (key == "X")
			this.close();
		if (key == "E") {
			if (this.value == -1 || this.value == this.qi)
				this.close();
			else
				this.enregistrer();
		}
	},
	
	enregistrer : function(){
		var arg = {op:"41"};
		arg.gap = this.caller.lv.cellGap.code;
		arg.codeLivr = this.caller.lv.livr.codeLivr;
		arg.gac = this.caller.lv.cellGac.code;
		arg.ac = this.ac;
		arg.prod = this.y.pd.prod;
		arg.qte = this.value;
		arg.operation = "Commande / attribution d'une quantité";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Enregistrement fait");
			this.close();
		}, "Echec de l'enregistrement : ");
	}
}
AC.declare(AC.KBQVInput, AC.InputText);

/**************************************************************/
AC.KBQV = function(){}
AC.KBQV._static = {
	mask1 : AC.Flag.PARITE | AC.Flag.PAQUETSC | AC.Flag.NONCHARGE,
		
	mask2 : AC.Flag.DISTRIB | AC.Flag.EXCESTR | AC.Flag.PERTETR | AC.Flag.PAQUETSD,
}
AC.KBQV._proto = {
	className : "KBQV",
	
	init : function(caller, target){
		this.val = 0;
		this.target = target;
		var prod = Util.dataIndex(target);
		this.caller = caller;
		this.y = null;
		this.phase = this.caller.lv.slivr.phase;
		this.ac = this.caller.ac;
		for(var i = 0, y = null; y = this.caller.lvAc.bdl[i]; i++){
			if (y.pd.prod == prod) {
				this.y = y;
				break;
			}
		}
		if (!this.y)
			return;
		
		var lc = this.caller.lv.cellLivrC;
		this.reduc = lc.reduc;
		this.conv = new AC.Conv(this.y.pd, this.y.cv, this.reduc);

		this.parDemi = this.y.pd.parDemi;
		this.qmax = this.y.cv.qmax;
		this.qmaxr = this.parDemi ? this.qmax * 2 : this.qmax;
		
		this.qi = y.acApPr ? y.acApPr.qte : 0;
		this.val = this.qi;
		var ti = APP.Ctx.authUsr ? "<br>Quantité souhaitée" : "<br>Quantité attribuée";
		AC.SmallScreen.prototype.init.call(this, 650, this.paint(), "Valider", true, 
				this.y.pd.nom.escapeHTML() + ti);
		var ix = this.parDemi ? AC.SmallScreen.instructionsC : AC.SmallScreen.instructionsB ; 
		this.minHeight = 550;
		this.registerKB();
		this.show();
		this.kbShow("q", false, "E" + (this.parDemi ? "D" : ""), "pe", null, ix);
		this.displayVal();
		this.onVal();
	},
	
	onVal : function(){
		if (this.val <= this.qmaxr)
			this._kbdiag.html("<span class='vert'>Le seuil d'alerte est fixé à " + this.qmax +"</span>");
		else
			this._kbdiag.html("<span class='orange bold'>Le seuil d'alerte est fixé à " + this.qmax +"</span>");
		this.enable();
	},
		
	enEdition : function(){
		return this.qi != this.val;
	},
	
	onKB : function(key){
		if (key == "X")
			this.close();
		if (key == "E")
			this.enregistrer();
	},
	
	paint : function(){
		var sb = new StringBuffer();
		
		sb.append("<div class='acTB1B'>");
		var edx = new AC.edAcApPr(this.y.acApPr, null, this.y.pd, this.y.cv);
		var edg = new AC.edApPr(this.y.apPr, null, this.y.pd, this.y.cv);
		
		sb.append("<div class='acTR1'>");
		sb.append("<div class='acTDl acTD1l'>Quantité attribuée / souhaitée, montant, poids</div>");
		sb.append("<div class='acTDc bold'>" + edx.qteL(this.caller.eltAc.initiales) + "</div>");
		sb.append("<div class='acTDc2 bold'>" + edx.prix() + "</div>");
		sb.append("<div class='acTDc2 bold'>" + edx.poids() + "</div>");
		sb.append("</div>");
		sb.append("<div class='acTR1'>");
		sb.append("<div class='acTDl acTD1l'>Pour information, sommes des quantités, montants, poids du groupe</div>");
		sb.append("<div class='acTDc italic'>" + edg.qte() + "</div>");
		sb.append("<div class='acTDc2 italic'>" + edg.prix() + "</div>");
		sb.append("<div class='acTDc2 italic'>" + edg.poids() + "</div>");
		sb.append("</div>");
		sb.append("</div>");
		if (this.y.acApPr)
			sb.append(AC.Flag.print1(this.y.acApPr.flags, null, 0));

		sb.append("<div>La valeur <b>0</b> est acceptée et signifie <b>annulation de la commande de ce produit</b></div>");
		this.keyboard(sb, true);
		return sb.toString();
	},
	
	enregistrer : function(){
		var arg = {op:"41"};
		arg.gap = this.caller.lv.cellGap.code;
		arg.codeLivr = this.caller.lv.livr.codeLivr;
		arg.gac = this.caller.lv.cellGac.code;
		arg.ac = this.ac;
		arg.prod = this.y.pd.prod;
		arg.qte = this.val;
		arg.operation = "Commande / attribution d'une quantité";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Enregistrement fait");
			this.close();
		}, "Echec de l'enregistrement : ");
	}
}
AC.declare(AC.KBQV, AC.SmallScreen);

/****************************************************************/
AC.KBQ = function(){}
AC.KBQ._static = {
	mask1 : AC.Flag.PARITE | AC.Flag.PAQUETSC | AC.Flag.NONCHARGE,
		
	mask2 : AC.Flag.DISTRIB | AC.Flag.EXCESTR | AC.Flag.PERTETR | AC.Flag.PAQUETSD,
}
AC.KBQ._proto = {
	className : "KBQ",
	
	init : function(caller, callback, target, options){
		this.optqD = options.indexOf("-D") != -1;
		this.optqC = options.indexOf("-C") != -1;
		this.val = 0;
		this.target = target;
		var prod = Util.dataIndex(target);
		this.callback = callback;
		this.caller = caller;
		this.y = null;
		this.phase = this.caller.lv.slivr.phase;
		this.mask = this.phase < 3 ? AC.KBQ.mask1 : (AC.KBQ.mask1 | AC.KBQ.mask2);
		for(var i = 0, y = null; y = this.caller.lv.bdl[i]; i++){
			if (y.pd.prod == prod) {
				this.y = y;
				break;
			}
		}
		if (!this.y) {
			this.callBack.call(this.caller);
			return;
		}
		var lc = this.caller.lv.cellLivrC;
		this.reduc = lc.reduc;
		this.conv = new AC.Conv(this.y.pd, this.y.cv, this.reduc);
		this.parDemi = this.y.pd.parDemi;
		this.lp = this.y.pd.type == 2 && ((this.optqD && this.y.x.lprix.length != 0) 
				|| (this.optqC && this.y.x.lprixC.length != 0));
		var c = caller.changed[y.pd.prod];
		if (!c || c.qteD == undefined)
			this.val = this.y.x.decharge ? this.y.x.qteD : (this.y.x.charge ? this.y.x.qteC : this.y.x.qte);
		else
			this.val = c.qteD;
		var ti = "<br>";
		if (this.optqD)
			ti += "Quantité livrée";
		if (this.optqC)
			ti += "Quantité reçue";
		AC.SmallScreen.prototype.init.call(this, 650, this.paint(), null, true, 
				this.y.pd.nom.escapeHTML() + ti);
		this.registerKB();
		if (this.optqD) {
			this._razInfo = this._content.find("#razInfo");
			this._raz = this._razInfo.find("#raz");
			AC.oncl(this, this._raz, this.raz);
			this.setRazInfo();
		}
		var ix = AC.SmallScreen.instructionsB ; 
		this.minHeight = 550;
		this.kbShow("q", !this.optq, "E" + (this.parDemi ? "D" : ""), null, null, ix);
		this.show(this, this.onKB);
		this.displayVal();
	},

	setRazInfo : function(){
		if (this.optqD)
			this._razInfo.css("visibility", this.val == 0 ? "visible" : "hidden");
	},
	
	onKB : function(key){
		this.close();
		this.callback.call(this.caller, key == "X" || !key ? null : this.target, this.y, this.val);
	},

	onVal : function(){
		this.setRazInfo();
	},
	
	raz : function(){
		this.close();
		this.callback.call(this.caller, this.target, this.y, this.val, true);
	},
	
	paint : function(){
		var sb = new StringBuffer();
		var qx = "";
		if (this.optqD)
			qx += "reçue";
		if (this.optqC)
			qx += "livrée";
		
		sb.append("<div class='acTB1B'>");
		this.caller.displaySynthCD(sb, this.y);
		sb.append("</div>");
		sb.append(AC.Flag.print1(this.y.x.flags, this.mask, 1));

		if (this.phase < 2) {
			sb.append("<div class='italic bold large'>La quantité " + qx 
					+ " ne peut pas être saisie avant la date d'expdition</div>");
		} else if (this.phase > 4) {
			sb.append("<div class='italic bold large'>La quantité " + qx
					+ " ne peut pas être saisie après la date d'archivage</div>");
		} else {
			if (this.optqD) 
				sb.append("<div>La valeur <b>?</b> est acceptée et signifie <b>quantité inconnue</b></div>");
			if (this.optqC) 
				sb.append("<div>La valeur <b>?</b> est acceptée et signifie <b>quantité inconnue</b></div>");
			if (this.optq)
				sb.append("<div>La valeur <b>0</b> est acceptée et permet <b>d'annuler</b> une ligne</div>");
			this.keyboard(sb, true);
		}
		if (this.optqD)
		sb.append("<div id='razInfo' class='red talc'>Il est déclaré que la quantité reçue est <b>nulle</b>.<br>"
				+ "Pour mettre AUSSI à <b>0 toutes les quantités attribuées aux alterconsos</b>, cliquer "
				+ "sur ce bouton&nbsp;:&nbsp;<div id='raz' class='kbcellRAZ'>RAZ</div></div>");
		return sb.toString();
	}
}
AC.declare(AC.KBQ, AC.SmallScreen);

/****************************************************************/
AC.KBP = function(){}
AC.KBP._static = {}
AC.KBP._proto = {
	className : "KBP",
	
	init : function(caller, callback, target, options){
		this.optpD = options.indexOf("-D") != -1;
		this.optpC = options.indexOf("-C") != -1;
		this.val = 0;
		this.target = target;
		var prod = Util.dataIndex(target);
		this.callback = callback;
		this.caller = caller;
		this.phase = this.caller.lv.slivr.phase;
		this.mask = this.phase < 3 ? AC.KBQ.mask1 : (AC.KBQ.mask1 | AC.KBQ.mask2);
		this.y = null;
		for(var i = 0, y = null; y = this.caller.lv.bdl[i]; i++){
			if (y.pd.prod == prod) {
				this.y = y;
				break;
			}
		}
		if (!this.y) {
			this.callback.call(this.caller);
			return;
		}
		var lc = this.caller.lv.cellLivrC;
		this.reduc = lc.reduc;
		this.conv = new AC.Conv(this.y.pd, this.y.cv, this.reduc);
		this.lp = this.y.pd.type == 2 && ((this.optpD && this.y.x.lprix.length != 0) 
				|| (this.optpC && this.y.x.lprixC.length != 0));
		var c = caller.changed[y.pd.prod];
		if (!c || c.poidsD == undefined)
			this.val = this.y.x.decharge ? this.y.x.poidsD : 
				(this.y.x.charge ? this.y.x.poidsC : this.y.x.poids);
		else
			this.val = c.poidsD;
		var ti = "<br>";
		if (this.optpD)
			ti += "Poids reçu";
		if (this.optpC)
			ti += "Poids livré";
		AC.SmallScreen.prototype.init.call(this, 650, this.paint(), null, true, 
				this.y.pd.nom.escapeHTML() + ti);
		this.registerKB();
		var ix = AC.SmallScreen.instructionsD ; 
		this.minHeight = 550;
		this.kbShow("p", true, "E", null, null, ix);
		this.show(this, this.onKB);
		this.displayVal();
	},

	onKB : function(key){
		this.close();
		this.callback.call(this.caller, key == "X" || !key ? null : this.target, this.y, this.val);
	},
	
	paint : function(){
		var sb = new StringBuffer();
		var px = "";
		if (this.optpD)
			px += "déchargé";
		if (this.optqC)
			px += "chargé";
		
		sb.append("<div class='acTB1B'>");
		this.caller.displaySynthCD(sb, this.y);
		sb.append("</div>");
		sb.append(AC.Flag.print1(this.y.x.flags, this.mask, 1));

		if (this.phase < 2) {
			sb.append("<div class='italic bold large'>Le poids " + px 
					+ " ne peut pas être saisi avant la date d'expédition</div>");
		} else if (this.phase > 4) {
			sb.append("<div class='italic bold large'>Le poids " + px
					+ " ne peut pas être saisi après la date d'archivage</div>");
		} else {
			if (this.optpD) 
				sb.append("<div>La valeur <b>?</b> est acceptée et signifie <b>poids inconnu</b></div>");
			if (this.optpC) 
				sb.append("<div>La valeur <b>?</b> est acceptée et signifie <b>poids inconnu</b></div>");
			this.keyboard(sb, true);
		}
		return sb.toString();
	}
}
AC.declare(AC.KBP, AC.SmallScreen);	

/****************************************************************/
AC.KBQP = function(){}
AC.KBQP._static = {
	mask1 : AC.Flag.NONCHARGE,
		
	mask2 : AC.Flag.EXCESTR | AC.Flag.PERTETR,

}
AC.KBQP._proto = {
	className : "KBQP",
	
	init : function(caller, callback, target){
		this.mode = 2;
		this.target = target;
		this.prod = Util.dataIndex(target);
		this.callback = callback;
		this.caller = caller;
		this.gap = this.caller.lv.cellGap.code;
		this.cellGac = this.caller.lv.cellGac;
		this.phase = this.caller.lv.slivr.phase;

		this.allAc = [];
		var lst = this.cellGac.getContacts();
		var lc = this.caller.lv.cellLivrC;
		this.lc = lc;
		this.reduc = lc.reduc;
		var ap = Math.floor(this.prod / 10000);
		var pr = this.prod % 10000;
		for(var i = 0, e = null; e = lst[i]; i++) {
			var x = lc.getAcApPr(false, e.code, ap, pr);
			if (e.suppr && (!x || x.status != 2 || !x.qte))
				continue;
			var t = {initiales:e.initiales, code:e.code, label:e.label, x:x, m:null};
			this.allAc.push(t);
		}

		this.val = 0;
		this.y = null;
		for(var i = 0, y = null; y = this.caller.lv.bdl[i]; i++){
			if (y.pd.prod == this.prod) {
				this.y = y;
				break;
			}
		}
		if (!this.y) {
			this.callback.call(this.caller);
			return;
		}
		var lc = this.caller.lv.cellLivrC;
		this.reduc = lc.reduc;
		this.conv = new AC.Conv(this.y.pd, this.y.cv, this.reduc);
		this.curAc = 0;
		this.pu = this.y.cv.pu;
		this.pd = this.y.pd;
		this.poids = this.y.cv.poids;
		this.vrac = this.y.pd.type == 3;
		this.parDemi = this.y.pd.parDemi;
		this.poids = this.y.cv.poids;
		
		this.flagsCST = y.x.flags & (this.phase < 3 ? AC.KBQP.mask1 : AC.KBQP.mask1 | AC.KBQP.mask2);

		var x = this.y.x;
		this.qteTR = x && !(x.qte === undefined) ? x.qte : 0;
		this.poidsTR = x && !(x.poids === undefined) ? x.poids : 0;
		this.hasTR = false;
		if (x && x.charge) {
			this.qteTR = x.qteC;
			this.poidsTR = x.poidsC;
			this.hasTR = true;
		}
		if (x && x.decharge) {
			this.qteTR = x.qteD;
			this.poidsTR = x.poidsD;
			this.hasTR = true;
		}
		this.prefc = this.poids;
		var ti = this.y.pd.type == 3 ? "<br>Quantités / poids attribués" : "<br>Quantités attribuées";
		
		AC.SmallScreen.prototype.init.call(this, -800, this.paint(), "Valider", true, 
				this.y.pd.nom.escapeHTML() + ti);
		this.register();
		this.show();
		this.repaint();
	},
		
	displaySynth : function(){
		var x = this.y.x;
		var sb = new StringBuffer();
		
		var m = {}
		m.qte = this.qteT;
		m.poids = this.poidsT;
		m.prix = this.prixT;
		
		sb.append("<div class='acTB1B'>");
		this.caller.displaySynthCD(sb, this.y, m);
		
		if (this.y.pd.type == 3) {
			var conv = new AC.Conv(this.y.pd, this.y.cv, this.lc.reduc);
			sb.append("<div class='acTR1'>");
			sb.append("<div class='acTDl acTD1l'>Poids moyen inscrit au catalogue</div>");
			sb.append("<div class='acTDc'>&nbsp;</div>");
			sb.append("<div class='acTDc2'>&nbsp;</div>");
			sb.append("<div class='acTDc2'>" + conv.edp(this.poids) + "</div>");
			sb.append("</div>");
		}
		
		sb.append("</div>");
		
		var flags = 0;
		if (this.nbFrust)
			flags = flags | AC.Flag.FRUSTRATION;
		if (this.nbQmax)
			flags = flags | AC.Flag.QMAX;
		if (this.parDemi && this.qteT % 2 == 1)
			flags = flags | AC.Flag.PARITE;
		if (this.hasTR && (this.qteT != this.qteTR || (this.poidsT < this.poidsTR * 0.95) 
				|| (this.poidsT > this.poidsTR * 1.05)))
			flags = flags | AC.Flag.DISTRIB;
		
		if (this.flagsCST | flags)
			sb.append(AC.Flag.print1(this.flagsCST | flags, AC.Flag.ALL, 1));

		sb.append("</div>");
		this._zh.html(sb.toString());
	},
		
	displayAc : function(sb, x, nb){
		sb.append("<div class='acrow acrow" + (nb % 2) + "p' data-index='" + x.code + "'>");
		sb.append("<div class='acIdent'>" + x.label + "</div>");
		sb.append("<div class='acETC'>");

		sb.append("<div class='acICFX'>");
		if (x.frust)
			sb.append(AC.Flag.img(AC.Flag.FRUSTRATION));
		if (x.qmax)
			sb.append(AC.Flag.img(AC.Flag.QMAX));
		if (!x.frust && !x.qmax)
			sb.append("&nbsp;");
		sb.append("</div>");

		var conv = new AC.Conv(this.y.pd, this.y.cv, this.lc.reduc);
		var es = !x.qS || x.qS == x.qT ? "" :
			" (" + conv.edq(x.qS) + "&nbsp;cmd&nbsp;" + x.initiales + ")";
		var cl1 = " zbtn qte'>";
		var cl2 = this.vrac ? " zbtn poids'>" : "'>";
		
		var oldq = -1;
		var yq = false;
		if (x.x && !(x.x.qte == undefined) && x.x.qte != x.qT) {
			yq = true;
			oldq = x.x.qte;
		}
		var oldp = -1;
		var yp = false;
		if (x.x && !(x.x.poids == undefined) && x.x.poids != x.pT){
			yp = true;
			oldp = x.x.poids;
		}
		
		if (!x.x && !x.m) {
			sb.append("<div class='acPM talc" + cl1 + "&nbsp;</div>");
			sb.append("<div class='acPM2 talc" + cl2 + "&nbsp;</div>");
			sb.append("<div class='acPM talc'>&nbsp;</div>");
		} else {
			if (!x.x ||AC.LivrC.aPoidsEstime(x.x)){
//			if (!x.x || x.x.poids_) {
				// ancien poids calcule, qte saisie
				if (x.m) {
					// changement
					if (!(x.m.qte == undefined)){
						// nouvelle qte saisie
						sb.append("<div class='acPM talc" + cl1 + conv.edqS(oldq, x.qT, yq, es) + "</div>");
						sb.append("<div class='acPM2 talc" + cl2 + conv.edpC(-1, x.qT, x.pT, false) + "</div>");
					} else {
						// nouveau poids saisi
						sb.append("<div class='acPM talc" + cl1 + conv.edqC(oldq, x.qT, x.pT, false, es) + "</div>");
						sb.append("<div class='acPM2 talc" + cl2 + conv.edpS(-1, x.pT, yp) + "</div>");
					}
				} else {
					// inchange
					sb.append("<div class='acPM talc" + cl1 + conv.edqS(-1, x.qT, false, es) + "</div>");
					sb.append("<div class='acPM2 talc" + cl2 + conv.edpC(-1, x.qT, x.pT, false) + "</div>");
				}
			} else {
				// ancien poids saisi, qte calculee
				if (x.m) {
					// changement
					if (!(x.m.qte == undefined)){
						// nouvelle qte saisie
						sb.append("<div class='acPM talc" + cl1 + conv.edqS(-1, x.qT, yq, es) + "</div>");
						sb.append("<div class='acPM2 talc" + cl2 + conv.edpC(oldp, x.qT, x.pT, false) + "</div>");
					} else {
						// nouveau poids saisi
						sb.append("<div class='acPM talc" + cl1 + conv.edqC(-1, x.qT, x.pT, false, es) + "</div>");
						sb.append("<div class='acPM2 talc" + cl2 + conv.edpS(oldp, x.pT, yp) + "</div>");
					}
				} else {
					// inchange
					sb.append("<div class='acPM talc" + cl1 + conv.edqC(-1, x.qT, x.pT, false, es) + "</div>");
					sb.append("<div class='acPM2 talc" + cl2 + conv.edpS(-1, x.pT, false) + "</div>");
				}
			}
			sb.append("<div class='acPM talc'>");
			sb.append(conv.edeCp(x.mT, x.pT, false));
			sb.append("</div>");
		}

		sb.append("</div>");
		sb.append("<div class='acEnd'></div></div>");
	},
		
	displayLstAC : function(){
		var sb = new StringBuffer();
		this.nbFrust = 0;
		this.nbQmax = 0;
		this.qteT = 0;
		this.poidsT = 0;
		this.prixT = 0;
		this.nbchanged = 0;
		var nb = 0;
		var conv = new AC.Conv(this.y.pd, this.y.cv, this.lc.reduc);

		sb.append("<div class='actable'>");
		sb.append("<div class='acrow inverse bold italic'>");
		sb.append("<div class='acIdent'>Alterconso</div>");
		sb.append("<div class='acETC'>");
		sb.append("<div class='acICFX'>Alertes</div>");
		sb.append("<div class='acPM talc'>Quantité</div>");
		sb.append("<div class='acPM2 talc'>Poids</div>");
		sb.append("<div class='acPM talc'>Prix</div>");
		sb.append("</div><div class='acEnd'></div></div>");
		
		for (var i = 0, x = 0; x = this.allAc[i]; i++){
			x.qS = x.x && !(x.x.qteS === undefined) ? x.x.qteS : 0;
			
			if (x.m){
				if (!(x.m.qte == undefined)){
					x.qT = x.m.qte;
					x.pT = conv.q2p(x.qT).res;
				} else {
					x.pT = x.m.poids;
					x.qT = conv.p2q(x.pT).res;
				}
			} else {
				if (x.x){
					if (AC.LivrC.aPoidsEstime(x.x)) {
//					if (x.x.poids_){
						x.qT = x.x.qte;
						x.pT = conv.q2p(x.qT).res;
					} else {
						x.pT = x.x.poids;
						x.qT = conv.p2q(x.pT).res;						
					}
				} else {
					x.qT = 0;
					x.pT = 0;
				}
			}
			x.mT = conv.p2e(x.pT).res;
			
			this.qteT += x.qT;
			this.poidsT += x.pT;
			this.prixT += x.mT;
			
			x.frust = x.qT < x.qS;
			if (x.frust)
				this.nbFrust++;
			x.qmax = x.qT > this.y.cv.qmax;
			if (x.qmax)
				this.nbQmax++;
		
			x.changed = x.m;
			if (x.changed)
				this.nbchanged++;
		
			x.bottom = x.code != 1 && !x.x && !x.m;
			if (!x.bottom)
				this.displayAc(sb, x, nb++);
		}
		for (var i = 0, x = 0; x = this.allAc[i]; i++)
			if (x.bottom) 
				this.displayAc(sb, x, nb++);
		sb.append("</div>");
		this._zb.html(sb.toString());
		AC.oncl(this, this._zb.find(".qte"), this.clickQ);
		AC.oncl(this, this._zb.find(".poids"), this.clickP);
	},
	
	onVal : function(){
		if (this.val){
			if (this.mode == 0){
				var red = this.val > this.y.cv.qmax ? "red large bold" : "";
				this._kbdiag.html("<div class='" + red + "'>Seuil d'alerte : " + this.y.cv.qmax + "</div>");
			}
		} else
			this._kbdiag.html("");
	},
	
	paint : function(){
		var sb = new StringBuffer();
		this.keyboard(sb, false);
		sb.append("<div id='zh' class='zh2'></div>");
		sb.append("<div id='zb' class='zb2'></div>");
		return sb.toString();
	},
	
	repaint : function(){
		if (this.mode == 2) 
			this.kbHide();
		else
			this.displayVal();
		this.displayLstAC();
		this.displaySynth();
		this.enable();
	},
		
	onKB : function(key){
		if (key == "E")
			this.setVal();
	},
	
	register : function(){
		this.registerKB();
		this._zb = this._content.find("#zb");
		this._zh = this._content.find("#zh");
	},
	
	setVal : function() {
		if (this.val == -1)
			return;
//		if (this.mode == 3){
//			if (this.val == this.cv.poids)
//				this.pdef = 0;
//			else
//				this.pdef = this.val;
//			this.prefc = this.pdef ? this.pdef : (this.pdefi ? this.pdefi : this.cv.poids) ;
//			this.mode = 2;
//			this.repaint();
//			return;
//		}
		var m = this.curx.m;
		if (this.mode == 0){
			if (m) {
				delete m.poids;
				if (this.val == this.curx.x.qte)
					delete m.qte;
				else
					m.qte = this.val;
			} else
				this.curx.m = {qte: this.val};
		} else {
			if (m) {
				delete m.qte;
				if (this.val == this.curx.x.poids)
					delete m.poids;
				else
					m.poids = this.val;
			} else
				this.curx.m = {poids: this.val};
		}
		if (this.curx.m && this.curx.m.qte === undefined && this.curx.m.poids === undefined)
			delete this.curx.m;
		this.mode = 2;
		this.repaint();
	},

	clickQ : function(target) {
		var ac = Util.dataIndex(target);
		this.curx = null;
		for (var i = 0; this.curx = this.allAc[i]; i++)
			if (this.curx.code == ac) break;
		this.val = this.curx.m && this.curx.m.qte ? this.curx.m.qte 
				: (this.curx.x && this.curx.x.qte ? this.curx.x.qte : 0);
		this.mode = 0;
		this.kbShow("q", false, "E" + (this.parDemi ? "D" : ""), "pe");
		this.repaint();
	},

	clickP : function(target) {
		var ac = Util.dataIndex(target);
		this.curx = null;
		for (var i = 0; this.curx = this.allAc[i]; i++)
			if (this.curx.code == ac) break;
		this.val = this.curx.m && this.curx.m.poids ? this.curx.m.poids 
				: (this.curx.x && this.curx.x.poids ? this.curx.x.poids : 0);
		this.mode = 1;
		this.kbShow("p", false, "E", "qe");
		this.repaint();
	},
	
	enEdition : function(){
		return this.nbchanged > 0;
	},
	
	enregistrer : function(){
		var arg = {op:"41"};
		arg.gap = this.caller.cellGap.code;
		arg.gac = this.caller.cellGac.code;
		arg.codeLivr = this.caller.lv.livr.codeLivr;
		arg.lprix = [];
		arg.prod = this.prod;
		arg.lcdac = [];
		for(var i = 0, x = null; x = this.allAc[i]; i++){
			if (!x.m)
				continue;
			var z = {ac:x.code};
			if (!(x.m.qte === undefined))
				z.qte = x.m.qte;
			if (!(x.m.poids === undefined))
				z.poids = x.m.poids;
			arg.lcdac.push(z);
		}
//		if ((this.pdef && !this.pdefi) || (this.pdefi && this.pdef != this.pdefi))
//			arg.pdef = this.pdef;
		arg.operation = "Mise à jour des quantités / poids attribués ou distribués";
		AC.Req.post(this, "alterconsos", arg, function(data) {
			AC.Message.info("Mise à jour faite");
			this.close();
		}, function(data) {
			AC.Message.info("Echec de la mise à jour des quantités / poids attribués ou distribués");
		});
	}
	
}
AC.declare(AC.KBQP, AC.SmallScreen);

/****************************************************************/
AC.KBCHQ = function(){}
AC.KBCHQ._static = {}
AC.KBCHQ._proto = {
	className : "KBCHQ",
	
	init : function(caller, callback, target, eltAp){
		this.target = target;
		this.eltAp = eltAp;
		this.gac = Util.dataIndex(target);
		this.val = Util.dataIndex(target, "cheque");
		this.callback = callback;
		this.caller = caller;
		
		var ti = Util.editEltH(this.eltAp) + " : remise des chèques<br>du groupe "
			+ Util.editEltH(APP.Ctx.master.getElement(1, this.gac));
		
		AC.SmallScreen.prototype.init.call(this, 650, this.paint(), null, true, ti);
		this.registerKB();
		var ix = AC.SmallScreen.instructionsE ; 
		this.minHeight = 550;
		this.kbShow("e", false, "E", null, null, ix);
		this.show(this, this.onKB);
		this.displayVal();
	},

	onKB : function(key){
		var ok = key == "E";
		var val = this.val;
		var ap = this.eltAp.code;
		var gac = this.gac
		this.close();
		this.callback.call(this.caller, ok, ap, gac, val);
	},
	
	paint : function(){
		var sb = new StringBuffer();
		this.keyboard(sb, true);
		return sb.toString();
	}
}
AC.declare(AC.KBCHQ, AC.SmallScreen);	

/****************************************************************/
AC.RecapCompta = function(livrC, ap, noComptaAC){
	this.noComptaAC = noComptaAC;
	this.livrC = livrC;
	
	this.ctlg = this.livrC.getCtlgLivr(this.livrC.codeLivr, ap, this.livrC.gac);
	if (!ap) {
		if (APP.Ctx.authType == 1 && APP.Ctx.authUsr)
			this.headX = livrC.getAc(true, APP.Ctx.authUsr);
		else
			this.headX = livrC.getGac(true);
	} else {
		if (APP.Ctx.authType == 1 && APP.Ctx.authUsr)
			this.headX = livrC.getAcAp(true, APP.Ctx.authUsr, ap);
		else
			this.headX = livrC.getAp(true, ap);		
	}
	this.ap = ap;
	this.cellGap = this.livrC.cellGap;
	this.eltGap = this.cellGap.get(1);
}
AC.RecapCompta._static = {
}
AC.RecapCompta._proto = {
	className : "RecapCompta",

	print : function(){		
		var x = this.headX;
		var tb = new AC.Table(4, true, false, "2");
		tb.clazz("inverse bold").row("Producteurs", "Produits<br>Supplt.", "Chèque<br>Avoirs", 
				"Paniers<br>retirés", "DB / CR<br><i>Justif.</i>");
		
		var estMono = this.cellGap.estMono();
		if (estMono) {
			this.ligneCompta100(tb, this.headX, this.eltGap, true)
			return tb.flush();
		}
		this.ligneCompta1(tb, this.headX, this.eltGap);
		var eltAps = this.ap ? [this.cellGap.get(this.ap)] : this.cellGap.sortedEltsFromSet(this.ctlg);
		for(var i = 0, eltAp = null; eltAp = eltAps[i]; i++){
			if (APP.Ctx.authType == 1 && APP.Ctx.authUsr)
				var x = this.livrC.getAcAp(true, APP.Ctx.authUsr, eltAp.code);
			else
				var x = this.livrC.getAp(true, eltAp.code);
			if (eltAp.code > 1 && eltAp.code < 100)
				this.ligneCompta2(tb, x, eltAp);
			else
				this.ligneCompta100(tb, x, eltAp, false);
		}
		return tb.flush();
	},

	ligneCompta1 : function(tb, x, elt){
		if ((x.prix + x.suppl == x.cheque) && !x.panierAtt)
			tb.clazz("bold bggris italic");
		else
			tb.clazz("bold");
		var c0 = "Synthèse pour le Groupement";
		
		if (x.type == "Ap" || x.type == "Gac"){
			var c1 = x.prixDX ? INT.editE(x.prixDX) : (x.suppl > 0 ? "-" : "&nbsp;");
			if (this.noComptaAC && x.prixDX != x.prixCX)
				c1 += "<span class='red bold'>&nbsp;/&nbsp;" + INT.editE(x.prixCX) + "</span>";
		} else {
			var c1 = x.prix ? INT.editE(x.prix) : (x.suppl > 0 ? "-" : "&nbsp;");
			if (this.noComptaAC && x.prix != x.prixC)
				c1 += "<span class='red bold'>&nbsp;/&nbsp;" + INT.editE(x.prixC) + "</span>";			
		}
		if (x.suppl > 0)
			c1 += "<br>" + INT.editE(x.suppl);
		
		var c2 = x.cheque ? INT.editE(x.cheque) : (x.suppl < 0 ? "-" : "&nbsp;");
		if (x.suppl < 0)
			c2 += "<br>" + INT.editE(-x.suppl);
		var rf = x.regltFait ? x.regltFait : 0;
		var ra = x.panierAtt ? x.panierAtt : 0;
		var rt = rf + ra;
		var c3 = !rt ? "" : "" + rf + " sur " + rt;
		var c4 = [];
		if (x.dbj)
			c4.push("<i>" + INT.editE(x.dbj) + " DBJ</i>");
		if (x.crj)
			c4.push("<i>" + INT.editE(x.crj) + " CRJ</i>");
		if (x.db)
			c4.push("<b>" + INT.editE(x.db) + " DB</b>");
		if (x.cr)
			c4.push("<b>" + INT.editE(x.cr) + " CR</b>");
		tb.row(c0, c1, c2, c3, c4.join("<br>"));
	},

	ligneCompta2 : function(tb, x, elt){
		if (elt.suppr && !x.prix)
			return;
		var c0 = Util.editEltH(elt);
		if (x.type == "Ap") {
			var c1 = INT.editE(x.prixDX);
			if (this.noComptaAC && x.prixDX != x.prixCX)
				c1 += "<span class='red bold'>&nbsp;/&nbsp;" + INT.editE(x.prixCX) + "</span>";
			else if (x.prixDX && x.prixDX != x.prix)
				c1 += "<span class='red bold'>&nbsp;/&nbsp;" + INT.editE(x.prix) + "</span>";
		} else {
			var c1 = INT.editE(x.prix);
			if (this.noComptaAC && x.prix != x.prixC)
				c1 += "<span class='red bold'>&nbsp;/&nbsp;" + INT.editE(x.prixC) + "</span>";
		}
		tb.row(c0, c1);
	},

	ligneCompta100 : function(tb, x, elt, estMono){
		if (elt.suppr && !x.prix && !x.prixC && !x.suppl && !x.prixPG && !x.cheque)
			return;
		var ppg = x.prixPG ? x.prixPG : 0;

		if ((x.prix + ppg + x.suppl == x.cheque) && !x.panierAtt)
			tb.clazz("bggris italic");
		var c0 = Util.editEltH(elt);
		
		var prix = x.type == "Ap" ? x.pricDX : x.prix;
		var prixC = x.type == "Ap" ? x.pricCX : x.prixC;
		
		
		var c1 = INT.editE(prix + ppg);
		var bx = this.noComptaAC && prix != prixC;
		if (bx)
			c1 += "<span class='red bold'>&nbsp;/&nbsp;" + INT.editE(prixC + ppg) + "</span>";
		if (!estMono && prix && elt.code == 1) {
			var c1x = INT.editE(prix);
			if (bx)
				c1x +=  "<span class='red bold'>&nbsp;/&nbsp;" + INT.editE(prixC) + "</span>";
			c1 += "<br><i>(" + c1x + ")</i>";
		}
		if (x.suppl > 0)
			c1 += "<br>" + INT.editE(x.suppl);
		
		var c2 = x.cheque ? INT.editE(x.cheque) : (x.suppl < 0 ? "-" : "&nbsp;");
		if (x.suppl < 0)
			c2 += "<br>" + INT.editE(-x.suppl);
		var rf = x.regltFait ? x.regltFait : 0;
		var ra = x.panierAtt ? x.panierAtt : 0;
		var rt = rf + ra;
		var c3 = !rt ? "" : "" + rf + " sur " + rt;
		var c4 = [];
		if (x.db && x.descr)
			c4.push("<i>" + INT.editE(x.db) + " DBJ</i>");
		if (x.cr && x.descr)
			c4.push("<i>" + INT.editE(x.cr) + " CRJ</i>");
		if (x.db && !x.descr)
			c4.push("<b>" + INT.editE(x.db) + " DB</b>");
		if (x.cr && !x.descr)
			c4.push("<b>" + INT.editE(x.cr) + " CR</b>");
		tb.row(c0, c1, c2, c3, c4.join("<br>"));
	}

}
AC.declare(AC.RecapCompta);

/****************************************************************/
AC.RecapComptaAp = function(livrP, codeLivr, ap, sLivr){
	this.sLivr = sLivr;
	this.ap = ap;
	this.cellGap = APP.Ctx.loginGrp;
	this.estMono = this.cellGap.estMono();
	this.eltAp = this.cellGap.get(ap);
	if (this.ap == 1)
		this.headX = livrP.getSG(true, codeLivr);
	else
		this.headX = livrP.getSGAp(true, codeLivr, ap);
	this.ligne = ap == 1 ? this.ligneCompta1 : (ap > 1 && ap < 100 ? this.ligneCompta2 : this.ligneCompta100);
}
AC.RecapComptaAp._static = {
}
AC.RecapComptaAp._proto = {
	className : "RecapComptaAp",

	print : function(){		
		var tb = new AC.Table(6, true, false);
		tb.clazz("inverse bold").row("Groupes", "(1) Produits<br>Supplt/Avoirs", "Chèque", 
				"(3) Remise<br>chèques", "Différence<br>(3) - (1)",
				"Paniers<br>retirés", "DB / CR<br><i>Justif.</i>");
		
		this.ligne(tb, this.headX, this.eltAp, true)

		for(var i = 0, lv = null; lv = this.sLivr[i]; i++){
			if (this.ap == 1)
				var x = lv.livrC.getGac(true);
			else
				var x = lv.livrC.getAp(true, this.ap);
			this.ligne(tb, x, lv.eltGac, false, lv.slivr.suppr);
		}
		return tb.flush();
	},

	ligneCompta1 : function(tb, x, elt, entete, ann){
		if ((x.prix + x.suppl == x.cheque) && !x.panierAtt)
			tb.clazz("bggris italic" + (entete ? " bold" : ""));
		else
			tb.clazz("" + (entete ? " bold" : ""));
		
		var c0a = (entete ? "Synthèse du producteur " : "") + Util.editEltH(elt).escapeHTML() 
			+ (ann ? "<span class='red bold'> - ANNULEE</span>" : "");

		if (!entete) {
			var ch = x.remiseCheque ? x.remiseCheque : x.cheque;
			var c0 = "<div class='action3 right remiseCheque' data-index='" 
				+ elt.code + "' data-cheque='" + ch + "'>Remise<br>chèques</div>" + c0a;
		} else
			var c0 = c0a;

		var c1 = x.prix ? INT.editE(x.prix) : "&nbsp;";
		if (x.prix != x.prixC)
			c1 += "<span class='red bold'><br>" + INT.editE(x.prixC) + "</span>";
		if (x.suppl > 0)
			c1 += "<br>+" + INT.editE(x.suppl);
		if (x.suppl < 0)
			c1 += "<br>-" + INT.editE(-x.suppl);

		var c2 = x.cheque ? INT.editE(x.cheque) : "&nbsp;";

		var c2b = x.remiseCheque ? INT.editE(x.remiseCheque) : "";
		if (x.cheque && x.remiseCheque && x.cheque != x.remiseCheque){
			var diff = x.remiseCheque - x.cheque;
			c2b += "<br><span class='bold " + (diff > 0 ? "vert'>" : "red'>") +
				(diff > 0 ? ("+" + INT.editE(diff)) : ("-" + INT.editE(-diff))) + "</span>";
		}
		var c2c = "";
		if (x.remiseCheque){
			var diff = x.remiseCheque - x.prix - x.suppl;
			if (diff)
				c2c = "<span class='bold " + (diff > 0 ? "vert'>" : "red'>") +
				(diff > 0 ? ("+" + INT.editE(diff)) : ("-" + INT.editE(-diff))) + "</span>";
		}

		var rf = x.regltFait ? x.regltFait : 0;
		var ra = x.panierAtt ? x.panierAtt : 0;
		var rt = rf + ra;
		var c3 = !rt ? "" : "" + rf + " sur " + rt;
		var c4 = [];
		if (x.dbj)
			c4.push("<i>" + INT.editE(x.dbj) + " DBJ</i>");
		if (x.crj)
			c4.push("<i>" + INT.editE(x.crj) + " CRJ</i>");
		if (x.db)
			c4.push("<b>" + INT.editE(x.db) + " DB</b>");
		if (x.cr)
			c4.push("<b>" + INT.editE(x.cr) + " CR</b>");
		tb.row(c0, c1, c2, c2b, c2c, c3, c4.join("<br>"));
	},

	ligneCompta2 : function(tb, x, elt, entete, ann){
		if (elt.suppr && !x.prix)
			return;
		var c0 = entete ? "<span class='italic bold'>Synthèse du producteur " : "<span>";
		c0 += Util.editEltH(elt).escapeHTML() + "</span>" 
			+ (ann ? "<span class='red bold'> - ANNULEE</span>" : "");
		var c1 = INT.editE(x.prix) + "&nbsp;V";
		if (x.prix != x.prixC)
			c1 += "<span class='red bold'><br>" + INT.editE(x.prixC) + "&nbsp;C</span>";
		if (x.prix != x.prixD)
			c1 += "<span class='red bold'><br>" + INT.editE(x.prixD) + "&nbsp;D</span>";
		tb.row(c0, c1);
	},

	ligneCompta100 : function(tb, x, elt, entete, ann){
		if (elt.suppr && !x.prix && !x.suppl && !x.prixPG && !x.cheque)
			return;

		if ((x.prix + x.suppl == x.cheque) && !x.panierAtt)
			tb.clazz("bggris italic");
		var c0a = entete ? "<span class='italic bold'>Synthèse du producteur " : "<span>";
		c0a += Util.editEltH(elt).escapeHTML() + "</span>"
			+ (ann ? "<span class='red bold'> - ANNULEE</span>" : "");
		if (!entete) {
			var ch = x.remiseCheque ? x.remiseCheque : x.cheque;
			var c0 = "<div class='action3 right remiseCheque' data-index='" 
				+ elt.code + "' data-cheque='" + ch + "'>Remise<br>chèques</div>" + c0a;
		} else
			var c0 = c0a;
		var c1 = x.prix ? INT.editE(x.prix) : "&nbsp;V";
		if (x.prix != x.prixC)
			c1 += "<span class='red bold'><br>" + INT.editE(x.prixC) + "&nbsp;C</span>";
		if (x.prix != x.prixD)
			c1 += "<span class='red bold'><br>" + INT.editE(x.prixD) + "&nbsp;D</span>";
		if (x.suppl > 0)
			c1 += "<br>+" + INT.editE(x.suppl);
		if (x.suppl < 0)
			c1 += "<br>-" + INT.editE(-x.suppl);
		
		var c2 = x.cheque ? INT.editE(x.cheque) : "&nbsp;";

		var c2b = x.remiseCheque ? INT.editE(x.remiseCheque) : "";
		if (x.cheque && x.remiseCheque && x.cheque != x.remiseCheque){
			var diff = x.remiseCheque - x.cheque;
			c2b += "<br><span class='bold " + (diff > 0 ? "vert'>" : "red'>") +
			(diff > 0 ? ("+" + INT.editE(diff)) : ("-" + INT.editE(-diff))) + "</span>";
		}

		var c2c = "";
		if (x.remiseCheque){
			var diff = x.remiseCheque - x.prix - x.suppl;
			if (diff)
				c2c = "<span class='bold " + (diff > 0 ? "vert'>" : "red'>") +
				(diff > 0 ? ("+" + INT.editE(diff)) : ("-" + INT.editE(-diff))) + "</span>";
		}

		var rf = x.regltFait ? x.regltFait : 0;
		var ra = x.panierAtt ? x.panierAtt : 0;
		var rt = rf + ra;
		var c3 = !rt ? "" : "" + rf + " sur " + rt;
		var c4 = [];
		if (x.db && x.descr)
			c4.push("<i>" + INT.editE(x.db) + " DBJ</i>");
		if (x.cr && x.descr)
			c4.push("<i>" + INT.editE(x.cr) + " CRJ</i>");
		if (x.db && !x.descr)
			c4.push("<b>" + INT.editE(x.db) + " DB</b>");
		if (x.cr && !x.descr)
			c4.push("<b>" + INT.editE(x.cr) + " CR</b>");
		tb.row(c0, c1, c2, c2b, c2c, c3, c4.join("<br>"));
	}

}
AC.declare(AC.RecapComptaAp);

/****************************************************************/

AC.Compta = function(cellLivrC, detail, paiement, noComptaAC){
	this.noComptaAC = noComptaAC;
	this.paiement = paiement
	this.detail = detail;
	this.ann = cellLivrC.slivr.suppr || cellLivrC.slivr.livr.suppr;
	this.cellLivrC = cellLivrC;
	this.ini = this.cellLivrC.cellGac.get(1).initiales;
	this.lstCh = [];
	this.estMono = !this.cellLivrC.cellGap.estMono();
}
AC.Compta._static = {
	retires : function(x){
		if (x.ap && x.ap > 1 && x.ap < 100)
			return "";
		var prg = x.regltFait;
		var pat = x.panierAtt;
		
		var s = "";
		if (prg == 1 && pat == 0)
			var s = "<span class='vert'>Panier retiré</span>";
		else if (prg == 0 && pat == 1)
			var s = "<span class='red bold'>Panier NON retiré</span>";
		else if (prg == 0 && pat == 0)
			var s = "<span class='red bold'>Aucun panier</span>";
		else {
			var s1 = pat || !prg ? "<span class='red bold'>" : "<span class='vert'>";
			var s = s1 + prg + (prg > 1 ? " paniers retirés sur " : " panier retiré sur ") 
				+ (prg + pat) + "</span>";
		}
		return "<div class='detail'>" + s + "</div>";
	},
	
	titreApGac : function(sb, x, noComptaAC){
		// x est toujours un Ap
//		if (x.type == "Ap") {
//			var c1 = x.prixDX ? INT.editE(x.prixDX) : "";
//			if (noComptaAC && x.prixDX != x.prixCX)
//				c1 += "<span class='red bold'>&nbsp;/&nbsp;" + INT.editE(x.prixCX) + "</span>";
//		} else {
//			var c1 = x.prix ? INT.editE(x.prix) : "";
//			if (noComptaAC && x.prix != x.prixC)
//				c1 += "<span class='red bold'>&nbsp;/&nbsp;" + INT.editE(x.prixC) + "</span>";			
//		}
		
		if (x.ap && x.ap > 1 && x.ap < 100){ // producteurs dépendants
			sb.append("<div class='acTDcc'>");
			sb.append("<div class='acTDcr'>&nbsp;</div>");
			sb.append("<div class='acTDdb'>" + INT.editE(x.prix) + "</div>");
			sb.append("</div>");
			sb.append("<div class='acTDcc'>");
			sb.append("<div class='acTDcr'>&nbsp;</div>");
			sb.append("<div class='acTDdb'>" + INT.editE(x.prixCX) + "</div>");
			sb.append("</div>");
			sb.append("<div class='acTDcc'>");
			sb.append("<div class='acTDcr'>&nbsp;</div>");
			sb.append("<div class='acTDdb'>" + INT.editE(x.prixDX) + "</div>");
			sb.append("<div class='acEnd'></div>");
			sb.append("</div>");
			return;
		}
		
		// producteurs indépendants et #1 
		sb.append("<div class='acTDcc'>");
		var prg = x.regltFait;
		if (prg){
			var cr = x.cr;
			var db = x.db;
			if (cr)
				sb.append("<div class='acTDcr bold red'>" + INT.editE(cr) + "</div>");
			else
				sb.append("<div class='acTDcr'>-</div>");
			if (db)
				sb.append("<div class='acTDdb bold red'>" + INT.editE(db) + "</div>");
			else
				sb.append("<div class='acTDdb'>-</div>");
			sb.append("<div class='acEnd'></div>");
		}
		sb.append("<div class='talc'>" + this.retires(x) + "</div>");
		sb.append("</div>");
	},

	titreGapAp : function(sb, x, noComptaAC){ // x est AcAp Ap Ac ClAc Gac
		sb.append("<div class='acTDcc'>");
		if (!x) {
			sb.append("<span class='red bold'>Livraison ANNULEE</span></div>");
			return;
		}
		if (x.type == "Ap") {
			var c1 = x.prixDX ? INT.editE(x.prixDX) : "";
			if (noComptaAC && x.prixDX != x.prixCX)
				c1 += "<span class='red bold'>&nbsp;/&nbsp;" + INT.editE(x.prixCX) + "</span>";			
		} else {
			var c1 = x.prix ? INT.editE(x.prix) : "";
//			if (noComptaAC && x.prix != x.prixC) // ne devrait jamais se produire
//				c1 += "<span class='red bold'>&nbsp;/&nbsp;" + INT.editE(x.prixC) + "</span>";
		}
		if (x.ap && x.ap > 1 && x.ap < 100){
			sb.append("<div class='acTDcr'>&nbsp;</div>");
			sb.append("<div class='acTDdb'>" + c1 + "</div>");
			sb.append("<div class='acEnd'></div>");
			sb.append("</div>");
			return;
		}
		
		var prg = x.regltFait;
		if (prg){
			var cr = x.type == "Gac" ? x.cr + x.crj : x.cr;
			var db = x.type == "Gac" ? x.db + x.dbj : x.db;
			if (cr)
				sb.append("<div class='acTDcr bold red'>" + INT.editE(cr) + "</div>");
			else
				sb.append("<div class='acTDcr'>-</div>");
			if (db)
				sb.append("<div class='acTDdb bold red'>" + INT.editE(db) + "</div>");
			else
				sb.append("<div class='acTDdb'>-</div>");
			sb.append("<div class='acEnd'></div>");
		}
		sb.append("<div class='talc'>" + (noComptaAC ? "" : this.retires(x)) + "</div>");
		sb.append("</div>");
	},
	
	titreAc : function(elt, x, sp, large){ // x: AcAp ou ClAc ou Ac
		var sb = new StringBuffer();
		var cl = large ? " large" : "";
		if (sp)
			sb.append("<div class='acTRSP1'><div class='acTDSP'>&nbsp;</div><div class='acTDSP'>&nbsp;</div></div>");
		sb.append("<div class='acTR1TC" + (large ? "'>" : "2'>"));
		sb.append("<div class='acTDl acNomAc acNomAc2" + cl + "' data-index='" + elt.code 
				+ "' data-gac='" + x.cell.cellGac.code + "'>");
		sb.append("<i>" + Util.editEltH(elt) + "</i>");
		if (elt.telephones && (APP.Ctx.authRole == 4 || elt.confidentialite != 2))
			sb.append("<span class='standard'>&nbsp;&nbsp;(" + elt.telephones + ")</span>")
		sb.append("</div>");
		AC.Compta.titreGapAp(sb, x);
		sb.append("</div>");
		return sb.toString();
	},
	
	space2 : function(sb){
		sb.append("<div class='acTRSP2'><div class='acTDSP'>&nbsp;</div><div class='acTDSP'>&nbsp;</div></div>");
	},
	
	space1 : function(sb){
		sb.append("<div class='acTRSP1'><div class='acTDSP'>&nbsp;</div><div class='acTDSP'>&nbsp;</div></div>");
	},

	space05 : function(sb){
		sb.append("<div class='acTRSP05'><div class='acTDSP'>&nbsp;</div><div class='acTDSP'>&nbsp;</div></div>");
	},

	space02 : function(sb){
		sb.append("<div class='acTRSP02'><div class='acTDSP'>&nbsp;</div><div class='acTDSP'>&nbsp;</div></div>");
	},
	
	printAllCheques : function(lstCh){
		var sb = new StringBuffer();
		if (!lstCh || !lstCh.length){
			sb.append("<div class='acSpace2 large bold italic'>Aucun chèque remis</div>");
		} else {
			sb.append("<div class='action exportCheques'>Export liste de chèques en Excel</div>");
			lstCh.sort(AC.Sort.t);
			sb.append("<div class='acTR1TC'>");
			sb.append("<div class='acTDl2 bold italic'>Chèques : ordre</div>");
			sb.append("<div class='acTDc2 bold italic'>Montant</div>");
			sb.append("<div class='acTDl2 acTDLast bold italic'>Alterconso émetteur</div>");
			sb.append("</div>");
			for(var i = 0, x = null; x = lstCh[i]; i++){
				sb.append("<div class='acTR1'>");
				sb.append("<div class='acTDl2'>" + x.oc.escapeHTML() + "</div>");
				sb.append("<div class='acTDc2 bold'>" + INT.editE(x.m) + "</div>");
				sb.append("<div class='acTDl2 acTDLast '>" + x.ac.escapeHTML() + 
						(x.ic ? "<br>" + x.ic.escapeHTML() : "") + "</div>");
				sb.append("</div>");
			}
			sb.append("<div class='acTRSP1'><div class='acTDSP'>&nbsp;</div>"
					+ "<div class='acTDSP'>&nbsp;</div><div class='acTDSP'>&nbsp;</div></div>");
		}
		return sb.toString();
	}

}

AC.Compta._proto = {
	className : "Compta",
			
	titreGac : function(x, ann){ // x : Ap
		var elt = this.cellLivrC.cellGac.get(1);
		var sb = new StringBuffer();
		sb.append("<div class='acTR1TC'>");
		sb.append("<div class='acTDl acNomGac' data-gac='" + this.cellLivrC.cellGac.code + "'>Groupe : ");
		sb.append(Util.editEltH(elt));
		if (ann)
			sb.append("<span class='red bold'> - ANNULEE</span>");
		sb.append("</div>");
		AC.Compta.titreApGac(sb, x, this.noComptaAC);
		sb.append("</div>");
		var cx = "<span" + (x.prixCX != x.prixDX ? " class='red bold'>" : ">") + INT.editE(x.prixCX) + "</span>";
		var dx = "<span" + (x.prixDX != x.prix ? " class='red bold'>" : ">") + INT.editE(x.prixDX) + "</span>";		
		this.lineDbCr2(sb, "Montant total des produits achetés", "<b>" + INT.editE(x.prix) + "</b>", "&nbsp;", cx, "&nbsp;", dx, "&nbsp;");
		if (x.suppl)
			this.lineDbCr(sb, "Balance des suppléments / avoirs", (x.suppl > 0 ? INT.editE(x.suppl) : "&nbsp;"),
					(x.suppl < 0 ? INT.editE(x.suppl) : "&nbsp;"));
		if (x.cheque)
			this.lineDbCr(sb, "Montant total des chèques émis", "&nbsp;", INT.editE(x.cheque));		
		return sb.toString();
	},

	titreGap2 : function(x, ann){ // x : Gac
		var elt = this.cellLivrC.cellGap.get(1);
		var sb = new StringBuffer();
		sb.append("<div class='acTR1TC'>");
		sb.append("<div class='acTDl acNomGap ' data-gap='" + elt.code + "'>Groupement : ");
		sb.append(Util.editEltH(elt));
		if (ann)
			sb.append("<span class='redlabel'>***Livraison ANNULEE*** </span>");
		sb.append("</div>");
		AC.Compta.titreGapAp(sb, x, this.noComptaAC);
		sb.append("</div>");

		if (x.dbj || x.crj)
			this.lineDbCr(sb, "Dont montant des débits et crédits justifiés ", 
					x.dbj ? INT.editE(x.dbj) : "-", x.crj ? INT.editE(x.crj) : "-");

		var c1 = x.prix ? INT.editE(x.prix) : "";
		if (this.noComptaAC && x.prix != x.prixC)
			c1 += "<span class='red bold'>&nbsp;/&nbsp;" + INT.editE(x.prixC) + "</span>";

		if (c1)
			this.lineDbCr(sb, "Montant total des produits achetés", c1, "&nbsp;");
		if (x.suppl)
			this.lineDbCr(sb, "Balance des suppléments / avoirs", (x.suppl > 0 ? INT.editE(x.suppl) : "&nbsp;"),
					(x.suppl < 0 ? INT.editE(x.suppl) : "&nbsp;"));
		if (x.cheque)
			this.lineDbCr(sb, "Montant total des chèques émis", "&nbsp;", INT.editE(x.cheque));		
		return sb.toString();
	},

	titreGap : function(x, ann){ // x: Ac
		var elt = this.cellLivrC.cellGap.get(1);
		var sb = new StringBuffer();
		sb.append("<div class='acTR1TC'>");
		sb.append("<div class='acTDl acNomGap' data-gap='" + elt.code + "'>");
		sb.append(Util.editEltH(elt));
		if (ann)
			sb.append("<span class='redlabel'>***Livraison ANNULEE*** </span>");
		sb.append("</div>");
		AC.Compta.titreGapAp(sb, x);
		sb.append("</div>");

		if (x.prix)
			this.lineDbCr(sb, "Montant total des produits achetés", INT.editE(x.prix), "&nbsp;");
		if (x.suppl)
			this.lineDbCr(sb, "Balance des suppléments / avoirs", (x.suppl > 0 ? INT.editE(x.suppl) : "&nbsp;"),
					(x.suppl < 0 ? INT.editE(x.suppl) : null));
		if (x.payePour || x.payePar)
			this.lineDbCr(sb, "Montant payés POUR / PAR des amis", (x.payePour ? INT.editE(x.payePour) : "&nbsp;"),
					(x.payePar ? INT.editE(x.payePar) : "&nbsp;"));
		if (x.cheque)
			this.lineDbCr(sb, "Montant total des chèques émis", "&nbsp;", INT.editE(x.cheque));		
		return sb.toString();
	},

	titreAp2 : function(elt, x){ // x: Ap
		var sb = new StringBuffer();
		AC.Compta.space2(sb);
		sb.append("<div class='acTR1TC' data-index='" + elt.code  
				+ "' data-gap='" + this.cellLivrC.cellGap.code + "'>");
		sb.append("<div class='acTDl acNomAp'>");
		sb.append(Util.editEltH(elt));
		sb.append("</div>");
		AC.Compta.titreGapAp(sb, x, this.noComptaAC);
		sb.append("</div>");
		var cx = "<span" + (x.prixCX != x.prixDX ? " class='red bold'>" : ">") + INT.editE(x.prixCX) + "</span>";
		var dx = "<span" + (x.prixDX != x.prix ? " class='red bold'>" : ">") + INT.editE(x.prixDX) + "</span>";	
		this.lineDbCr2(sb, "Montant total des produits achetés", "<b>" + INT.editE(x.prix) + "</b>", "&nbsp;", cx, "&nbsp;", dx, "&nbsp;");
		
		if (!this.noComptaAC){
			if (x.prixPG)
				this.lineDbCr(sb, "Montant total des produits achetés aux producteurs payés par le groupement", 
						INT.editE(x.prixPG), "&nbsp;");
			if (x.suppl)
				this.lineDbCr(sb, "Balance des suppléments / avoirs", (x.suppl > 0 ? INT.editE(x.suppl) : "&nbsp;"),
						(x.suppl < 0 ? INT.editE(x.suppl) : "&nbsp;"));
			if (x.cheque)
				this.lineDbCr(sb, "Montant total des chèques émis", "&nbsp;", INT.editE(x.cheque));		
			if (x.db || x.cr || x.descr){
				var ph = this.cellLivrC.phase();
				var ed = ph < 4 && ph > 2 && APP.Ctx.authType == 1 && !APP.Ctx.authUsr;
				var lib = !ed ? "<div>" : 
					"<div class='justif zbtn' data-index='" + elt.code  
						+ "' data-gap='" + this.cellLivrC.cellGap.code + "'>";
				this.line(sb, lib + "Justification du débit ou du crédit :" +
						(x.descr ? "<br><b>" + x.descr.escapeHTML() + "</b>" : "") + "</div>", "&nbsp;");
			}
		}
		return sb.toString();
	},

	titreAp : function(elt, x, nosp, ann){ // x: AcAp
		var sb = new StringBuffer();
		if (!nosp) {
			AC.Compta.space1(sb);
			sb.append("<div class='acTR1TC2'>");
		} else
			sb.append("<div class='acTR1TC3'>");
		var gap = this.cellLivrC.cellGap.code;
		var z = nosp ? " acNomAp2" : "";
		sb.append("<div class='acTDl acNomAp" + z + "' data-index='" + elt.code  
				+ "' data-ac='" + x.ac
				+ "' data-gap='" + gap + "'>");
		var px = this.paiement && (x.ap == 1 || x.ap >= 100) && x.ac;
		if (px)
			sb.append("<div class='action paiementBtn' data-ac='" + x.ac 
					+ "' data-ap=" + x.ap + "' data-gap='" + gap + "'>Paiement ...</div>"); 
		sb.append(Util.editEltH(elt));
		if (ann)
			sb.append("<span class='redlabel'>***Livraison ANNULEE*** </span>");
		if (px)
			sb.append("<div class='acEnd'></div>");
		sb.append("</div>");
		AC.Compta.titreGapAp(sb, x);
		sb.append("</div>");
		return sb.toString();
	},
	
	titreProd : function(y, cv, ini){
		var sb = new StringBuffer();
		var init = !ini ? "" : this.cellLivrC.cellGap.get(y.pd.ap).initiales + " - ";
		AC.PUed(sb, y.pd, cv.pu, this.cellLivrC.reduc);
		sb.append("<div class='acNomProd acNomProd2' data-gap='" + this.cellLivrC.cellGap.code 
				+ "' data-index='" + y.pd.prod + "'>");
		if (cv.dispo == 4)
			sb.append("<img class='acf-pic3 ildetail' src='images/dispo4.png'></img>");
		var an = y.pd.suppr ? "<div class='acsIL red'> - ANNULEE - </div>" : "";
		sb.append("<div class='acsILBT'>" + init + y.pd.nom.escapeHTML() + an + "</div></div>");
		return sb.toString();
	},

	line : function(sb, lib, lib2){
		if (!this.nblines) this.nblines = 0;
		var c = " nlin_" + (this.nblines++ % 2);
		sb.append("<div class='acTR1" + c + "'>");
		sb.append("<div class='acTDl ncol_0'>" + lib + "</div>");
		sb.append("<div class='acTDcc ncol_1'>");
		sb.append(lib2 ? lib2 : "&nbsp;");
		sb.append("</div></div>");
	},

	lineDbCr : function(sb, lib, db, cr, ch, dch, detail, detailTop, chx, dchx){
		if (!this.nblines) this.nblines = 0;
		var c = " nlin_" + (this.nblines++ % 2);
		if (detailTop)
			sb.append("<div class='acTR1" + c + " detailTR'>");
		else
			sb.append("<div class='acTR1" + c + "'>");
		sb.append("<div class='acTDl ncol_0'>" + lib + "</div>");
		sb.append("<div class='acTDcc ncol_1'>");
		if (cr)
			sb.append("<div class='acTDcr" + (detail ? " detail'>" : "'>") + cr + "</div>");
		if (db)
			sb.append("<div class='acTDdb'>" + db + "</div>");
		sb.append("</div>");
		if (ch || dch) {
			sb.append("<div class='acTDch ncol_0'>" + (ch ? ch : "&nbsp;") + "</div>");
			sb.append("<div class='acTDch ncol_1 acTDLast'>" + (dch ? dch : "&nbsp;") + "</div>");
		}
		sb.append("</div>");
	},

	lineDbCr2 : function(sb, lib, db, cr, ch, chx, dch, dchx){
		if (!this.nblines) this.nblines = 0;
		var c = " nlin_" + (this.nblines++ % 2);
		sb.append("<div class='acTR1" + c + "'>");
		sb.append("<div class='acTDl ncol_0'>" + lib + "</div>");
		sb.append("<div class='acTDcc ncol_1'>");
		sb.append("<div class='acTDcr'>" + cr + "</div>");
		sb.append("<div class='acTDdb'>" + db + "</div>");
		sb.append("</div>");
		
		sb.append("<div class='acTDch ncol_0'>");
		sb.append("<div class='acTDcr'>" + chx + "</div>");
		sb.append("<div class='acTDdb'>" + ch + "</div>");
		sb.append("</div>");

		sb.append("<div class='acTDch ncol_1 acTDLast'>");
		sb.append("<div class='acTDcr'>" + dchx + "</div>");
		sb.append("<div class='acTDdb'>" + dch + "</div>");
		sb.append("</div>");

		sb.append("</div>");
	},

	entete : function(sb){
		sb.append("<div class='acTR1TC2'>");
		sb.append("<div class='acTDl'>&nbsp;</div>");
		sb.append("<div class='acTDcc2'>");
		sb.append("<div class='acTDcr bold italic'>Crédit</div>");
		sb.append("<div class='acTDdb bold italic'>Débit</div>");
		sb.append("</div>");
		sb.append("<div class='acTDch bold italic'>Chargement</div>");
		sb.append("<div class='acTDch bold italic acTDLast'>Déchargement</div>");
		sb.append("</div>");
		// AC.Compta.space1(sb);
	},
	
	printCheques : function(lstCh){
		return AC.Compta.printAllCheques(this.lstCh);
	},

	getCheques : function(){
		return this.lstCh;
	},
		
	printApAc : function(ap) { // ap facultatif
		var xGac = this.cellLivrC.getGac(false);
		if (!xGac)
			return "";
		var sb = new StringBuffer();
		var n = 0;
		if (ap) {
			var s = this.printAllAc(this.cellLivrC.cellGap.get(ap));
			if (s) {
				sb.append(s);
				n++;
			}
		} else {
			var allAps = this.cellLivrC.cellGap.getContacts();
			// {code : x.code, elt : x, label : Util.editEltH(x)}
			for (var i = 0, xx = null; xx = allAps[i]; i++) {
				var s = this.printAllAc(xx.elt);
				if (s) {
					sb.append(s);
					n++;
				}
			}			
		}
		if (n == 0)
			return "";
		if (n == 1)
			return sb.toString();
		return	this.titreGap2(xGac, this.ann) + sb.toString();
	},

	printApAc2 : function(ap) {
		var xAp = this.cellLivrC.getAp(false, ap);
		if (!xAp)
			return "";
		var s = this.printAllAc(this.cellLivrC.cellGap.get(ap), true);
		return	this.titreGac(xAp, this.ann) + (s ? s : "");
	},

	printAllAc : function(eltAp, skip){
		var xAp = this.cellLivrC.getAp(true, eltAp.code);
		if (xAp.status != 2 && !xAp.prixCX && !xAp.prixDX && !xAp.prix)
			return "";
		var sb = new StringBuffer();
		if (!skip)
			sb.append(this.titreAp2(eltAp, xAp));
		this.printDetailApPr(sb, eltAp.code);
		if (!this.noComptaAC) {
			var allAcs = this.cellLivrC.cellGac.getContacts();
			// {code : x.code, elt : x, label : Util.editEltH(x)}
			if (allAcs && allAcs.length > 1) {
				for (var i = 0, xx = null; xx = allAcs[i]; i++) {
					var s = this.printAc(xx.code, eltAp, xx.elt);
					if (s)
						sb.append(s);
				}
			}
		}
		return sb.toString();
	},
	
	printAcComptas : function(eltAc){
		var sb = new StringBuffer();
		var xAc = this.cellLivrC.getAc(false, eltAc.code);
		var lstpr = this.cellLivrC.getAcAllAp(eltAc.code);
		for(var k = 0, y = null; y = lstpr[k]; k++)
			sb.append(this.printAp(eltAc.code, y.eltAp));
		return sb.toString();
	},

	printAc : function(ac, eltAp, eltAc){ 
		var sb = new StringBuffer();
		var ap = eltAp.code;
		var acAp = this.cellLivrC.getAcAp(false, ac, ap);
		if (!acAp)
			return "";
		if ((ap == 1 || ap >= 100) && acAp.cheque) {
			this.lstCh.push({
				m:acAp.cheque, 
				oc:eltAp.ordreCheque, 
				ac:this.ini + " / " + eltAc.initiales + " - " + eltAc.nom,
				ic:acAp.intitule ? acAp.intitule : "", 
				tri:eltAp.ordreCheque + "_" + this.ini + "_" + eltAc.initiales });
		}
		sb.append(AC.Compta.titreAc(eltAc, acAp, true));
		this.print1(sb, acAp, eltAp);
		if (this.detail)
			this.printDetail(sb, acAp);
		return sb.toString();
	},
	
	printAcAp : function(ac){ // ac obligatoire
		var sb = new StringBuffer();
		var n = 0;
		if (!this.estMono) {
			var xAc = this.cellLivrC.getAc(false, ac);
			if (!xAc)
				return "";
			var allAps = this.cellLivrC.cellGap.getContacts();
			// {code : x.code, elt : x, label : Util.editEltH(x)}
			for (var i = 0, xx = null; xx = allAps[i]; i++) {
				var s = this.printAp(ac, xx.elt);
				if (s) {
					sb.append(s);
					n++;
				}
			}
		} else {
			var s = this.printAp(ac, this.cellLivrC.cellGap.get(1));
			if (s) {
				sb.append(s);
				n++;
			}
		}
		if (n == 0)
			return "";
		if (n == 1)
			return sb.toString();
		return	this.titreGap(xAc, this.ann) + sb.toString();
	},

	printAp : function(ac, eltAp){ 
		var sb = new StringBuffer();
		var ap = eltAp.code;
		var acAp = this.cellLivrC.getAcAp(false, ac, ap);
		if (!acAp)
			return "";
		if ((ap == 1 || ap >= 100) && acAp.cheque) {
			var eltAc = this.cellLivrC.cellGac.get(ac);
			this.lstCh.push({
				m:acAp.cheque, 
				oc:eltAp.ordreCheque, 
				ac:eltAc.nom, 
				ic:acAp.intitule ? acAp.intitule : "", 
				tri:eltAp.ordreCheque + "_" + eltAc.initiales });
		}
		sb.append(this.titreAp(eltAp, acAp, true, this.ann));
		if (ap == 1 || ap >= 100)
			this.print1(sb, acAp, eltAp);
		if (this.detail)
			this.printDetail(sb, acAp);
		return sb.toString();
	},
	
	print1 : function(sb, x, eltAp){
		// x est toujours un AcAp : il n'a pas de prixC
		var p1 = x.prixPG ? x.prixPG + x.prix : x.prix;
		var c1 = p1 ? INT.editE(p1) : "";

		this.lineDbCr(sb, "Montant total des produits achetés", c1, "&nbsp;");
		if (eltAp.code == 1 || eltAp.code >= 100) {
			if (x.suppl) {
				var dsc = (x.supDescr ? " : " + x.supDescr : "");
				if (x.suppl > 0)
					this.lineDbCr(sb, "Suppléments" + dsc, INT.editE(x.suppl), "&nbsp;");
				if (x.suppl < 0)
					this.lineDbCr(sb, "Avoirs" + dsc, "&nbsp;", INT.editE(- x.suppl));
			}
			if (x.payePar) {
				for(var i = 0, y = null; y = x.lstPar[i]; i++) {
					var ami = this.cellLivrC.cellGac.get(y.ac).nom;
					this.lineDbCr(sb, "Montant payé PAR " + ami, "&nbsp;", INT.editE(y.m));
				}
			}
			if (x.payePour) {
				for(var i = 0, y = null; y = x.lstPour[i]; i++) {
					var ami = this.cellLivrC.cellGac.get(y.ac).nom;
					this.lineDbCr(sb, "Montant payé POUR " + ami, INT.editE(y.m), "&nbsp;");
				}
			}
			if (x.cheque)
				this.lineDbCr(sb, "Chèque établi à l'ordre de <i>" + eltAp.ordreCheque.escapeHTML() + "</i>" 
						+ (x.intitule ? "<br>" + x.intitule.escapeHTML() : ""), "&nbsp;", INT.editE(x.cheque));
			else {
				var chq = x.regltFait ? x.db : (x.prix + x.prixPG);
				if (chq && x.panierAtt) {
					this.lineDbCr(sb, "Chèque à établir à l'ordre de <i>" + eltAp.ordreCheque.escapeHTML() + "</i>" 
							+ (x.intitule ? "<br>" + x.intitule.escapeHTML() : ""), "&nbsp;", 
							"<span class='gris italic'>" + INT.editE(chq) + "</span>");
				}
			}
		}
	},
	
	printDetailApPr : function(sb, ap) {
		var lstpr = this.cellLivrC.getAllApPr(ap);
		for(var k = 0, y = null; y = lstpr[k]; k++){
			if (k == 0)
				this.lineDbCr(sb, "<span class='bold italic vert'>Produits</span>", null, null,null,null);

			var cv = y.pd.prix[this.cellLivrC.codeLivr];
			var lib = this.titreProd(y, cv);

			var qx1 = !y.x.qte ? "0" : (y.pd.parDemi ? INT.demi(y.x.qte) : y.x.qte);
			qx1 += !y.x.poids ? "" : "&nbsp;&nbsp;/&nbsp;&nbsp;" + INT.editKg(y.x.poids);
			var sb2 = new StringBuffer();
			if (y.pd.type == 2)
				this.lpC(sb2, y.x, y.pd, cv);
			var s = sb2.toString();
			if (s)
				lib += s;
			
			var xed = new AC.edApPr(y.x, null, y.pd, cv, "normal");
			var sty = y.x.prixCX != y.x.prixDX ? "<span class='red'>" : "<span>";
			var chx = xed.qteCX() + "&nbsp;&nbsp;/&nbsp;&nbsp;" + xed.poidsCX();
			var ch = sty + xed.prixCX() + "</span>";
			if (y.pd.type == 2 && y.x.lprixC.length)
				chx += "<br><i>(" + y.x.lprixC.length + "&nbsp;&nbsp;/&nbsp;&nbsp;" + xed.conv.e2p(y.x.lprixTC).ed() + ")</i>";
			var sty = y.x.prixDX != y.x.prix ? "<span class='red'>" : "<span>";
			var dchx = xed.qteDX() + "&nbsp;&nbsp;/&nbsp;&nbsp;" + xed.poidsDX();
			var dch = sty + xed.prixDX() + "</span>";
			if (y.pd.type == 2 && y.x.lprix.length)
				dchx += "<br><i>(" + y.x.lprix.length + "&nbsp;&nbsp;/&nbsp;&nbsp;" + xed.conv.e2p(y.x.lprixT).ed() + ")</i>";
			var c1 = INT.editE(y.x.prix);
			
			this.lineDbCr2(sb, lib, c1, qx1, ch, chx, dch, dchx);
		}
	},

	printAcDetails : function(eltAc, distrib, skipHdr){
		var sb = new StringBuffer();
		var xAc = this.cellLivrC.getAc(false, eltAc.code);
		var lstpr = this.cellLivrC.getAcAllApPr(eltAc.code);
		for(var k = 0, y = null; y = lstpr[k]; k++){
			if (k == 0 && !skipHdr) {
				var lib = "<span class='bold italic vert'>"
					+ Util.editEltH(this.cellLivrC.cellGap.get(1)) + "</span>" ;
				if (this.ann) {
					var qx = "<span class='red'>Livraison</span>";
					var px = "<span class='red'>ANNULEE</span>";
				} else {
					if (xAc) {
						var qx = AC.Compta.retires(xAc);
						var px = "<b>" + INT.editE(xAc ? xAc.prix : 0) + "</b>";
					}
					else {
						var qx = "";
						var px = "";
					}
				}
				this.lineDbCr(sb, lib, qx, px, null, null, distrib);
			}
			var cv = y.cv;
			var lib = this.titreProd(y, cv, true);
			var conv = new AC.Conv(y.pd, y.cv, this.cellLivrC.reduc);

			if (!y.x.qte)
				var q = "<b>0</b>";
			else {
				if (y.x.typePrix != 3)
					var q = "<b>" + (y.pd.parDemi ? INT.demi(y.x.qte) : y.x.qte) + "</b>";
				else {
					var qx = AC.LivrC.aPoidsEstime(y.x) ? y.x.qte : conv.p2q(y.x.poids).res;
					var q = "<b>" + conv.edq(qx) + "</b>";
				}
			}

			if (y.x.qteS != y.x.qte)
				q += "<span class='orange small ildetail'> (" + 
					(y.pd.parDemi ? INT.demi(y.x.qteS) : y.x.qteS) + " " + eltAc.initiales + ")<span>";
			var sb2 = new StringBuffer();
			sb2.append("<div>" + q + "</div>");
			if (y.pd.type == 2) {
				sb2.append("<div class='detail'>");
				var n1 = y.x.qte ? y.x.qte : 0;
				var n2 = y.x.lprix ? y.x.lprix.length : 0;
				var n3 = n1 > n2 ? n1 : n2;
				if (n1 > 0 && !n2)
					sb2.append("<div class='red bold'>!!PRIX ESTIMÉ!!</div>");
				for (var n = 0; n < n3; n++) {
					if (n < n2) {
						prx = y.x.lprix[n];
						var po = conv.e2p(prx).res;
						sb2.append("<div><i>" + INT.editE(prx) + "&nbsp;" + INT.editKg(po) + "</i></div>");
					} else
						sb2.append("<div>&nbsp;</div>");
				}
				sb2.append("</div>");
			}
			
			this.lineDbCr(sb, lib, sb2.toString(), INT.editE(y.x.prix), null, null, distrib, skipHdr);
		}
		return sb.toString();
	},

	printDetail : function(sb, acAp) {
		var lstpr = this.cellLivrC.getAcApAllPr(acAp.ac, acAp.ap);
		for(var k = 0, y = null; y = lstpr[k]; k++){
			if (k == 0)
				AC.Compta.space02(sb);
			
			var cv = y.pd.prix[this.cellLivrC.codeLivr];
			var lib = this.titreProd(y, cv);

			var sb2 = new StringBuffer();
			var q = !y.x.qte ? "0" : (y.pd.parDemi ? INT.demi(y.x.qte) : y.x.qte);
			var p = !y.x.poids ? "" : "&nbsp;&nbsp;/&nbsp;&nbsp;" + INT.editKg(y.x.poids);
			sb2.append(q + p);
			sb2.append();
			var conv = new AC.Conv(y.pd, cv,  this.cellLivrC.reduc);
			if (y.pd.type == 2 && y.x.lprix){
				if (y.x.lprix.length > 0 )
					for (var n = 0, prx = 0; prx = y.x.lprix[n]; n++) {
						var po = conv.e2p(prx).res;
						sb2.append("<br><i>" + INT.editE(prx) + "&nbsp;" + INT.editKg(po) + "</i>");
					}
				else
					sb2.append("<br><span class='red bold'>!!PRIX ESTIMÉ!!</span>");
			}
			
			this.lineDbCr(sb, lib, INT.editE(y.x.prix), sb2.toString(), null, null, true);
		}
	},
	
	lpC : function(t, x, pd, cv){
		var conv = new AC.Conv(pd, cv, this.cellLivrC.reduc);
		if (!x.lprix || (x.lprix.length == 0 && x.lprixC.length == 0))
			return ;
		var l1 = []; // lprix seulement
		var l2 = []; // lprixC seulement
		var l3 = []; // les deux
		var libs = [
			["<i>Déchargés : </i>", "<i>Déchargés : </i>", "<i>Déchargés <b>NON chargés</b> : </i>"],
			["<i>Chargés : </i>", "<i>Chargés : </i>", "<i>Chargés <b>NON déchargés</b> : </i>"],
			["<i>Chargés et déchargés : </i>", "<i>Chargés et déchargés : </i>", "<i>Chargés et déchargés : </i>"]
			];
		var il = x.lprix.length ? (x.lprixC.length ? 2 : 0) : (x.lprixC.length ? 1 : 2);
		var etag = [];
		var l1p = 0, l1m = 0;
		var etp = 0, etm = 0;
		for(var i = 0; i < x.lprix.length; i++){
			var m = Math.floor(x.lprix[i] / 1000);
			var p = conv.e2p(m).res;
			if (!(x.lprix[i] % 1000)) {
				etag.push(m);
				etp += p;
				etm += m
			} else {
				l1p += p;
				l1m += m;
			}
			l1.push(m);
		}
		for(var i = 0; i < x.lprixC.length; i++){
			var pr = Math.floor(x.lprixC[i] / 1000);
			var j = l1.indexOf(pr);
			if (j == -1)
				l2.push(pr);
			else {
				l1.splice(j, 1);
				l3.push(pr);
			}
		}
		if (l3.length != 0) {
			l3.sort(AC.Sort.num);
			t.append(libs[2][il]);
			for(var i = 0; i < l3.length; i++){
				var pr = l3[i];
				t.append(conv.ede(pr) + "/" + conv.e2p(pr).ed() + "   ");			
			}
		}
		if (l1.length != 0) {
			l1.sort(AC.Sort.num);
			if (l3.length != 0)
				t.append("<br>");
			t.append(libs[0][il]);
			for(var i = 0; i < l1.length; i++){
				var pr = l1[i];
				t.append(conv.ede(pr) + "/" + conv.e2p(pr).ed() + "   ");			
			}
		}
		if (l2.length != 0) {
			l2.sort(AC.Sort.num);
			if (l3.length != 0 || l1.length != 0)
				t.append("<br>");
			t.append(libs[1][il]);
			for(var i = 0; i < l2.length; i++){
				var pr = l2[i];
				t.append(conv.ede(pr) + "/" + conv.e2p(pr).ed() + "   ");			
			}
		}
		var brtodo = l3.length || l1.length || l2.length ? true : false;
		var nbd = l3.length + l1.length - etag.length;
		if (nbd < x.qte) {
			if (brtodo)	t.append("<br>");
			var pdef = cv.poids * (x.qte - nbd);
			var edef = conv.p2e(cv.poids).res * (x.qte - nbd);
			t.append("<span class='red bold'>ATTENTION - " + nbd + " affecté(s) pour " + x.qte + 
					" demandé(s) : " + INT.editE(l1m) + "/" + INT.editKg(l1p) + "</span>");
			t.append("<br><span class='red bold'>ATTENTION - " + (x.qte - nbd) + " attribués avec le poids par défaut : " + 
					INT.editE(edef) + "/" + INT.editKg(pdef) + "</span>");		
		}
		if (etag.length) {
			etag.sort(AC.Sort.num);
			if (brtodo)	t.append("<br>");
			t.append("<span class='red bold'>ATTENTION - " + etag.length + " sur étagère : " 
					+ INT.editE(etm) + "/" + INT.editKg(etp) + " : </span>");
			for(var i = 0; i < etag.length; i++){
				var pr = etag[i];
				t.append(conv.ede(pr) + "/" + conv.e2p(pr).ed() + "   ");			
			}	
		}
	},

//	lpC2 : function(t, x, pd, cv){
//		var conv = new AC.Conv(pd, cv, this.cellLivrC.reduc);
//		if (!x.lprix || (x.lprix.length == 0 && x.lprixC.length == 0))
//			return ;
//		var l1 = []; // lprix seulement
//		var l2 = []; // lprixC seulement
//		var l3 = []; // les deux
//		var etag = [];
//		var l1p = 0, l1m = 0;
//		var etp = 0, etm = 0;
//		for(var i = 0; i < x.lprix.length; i++){
//			var m = Math.floor(x.lprix[i] / 1000);
//			var p = conv.e2p(m).res;
//			if (!(x.lprix[i] % 1000)) {
//				etag.push(m);
//				etp += p;
//				etm += m
//			} else {
//				l1p += p;
//				l1m += m;
//			}
//			l1.push(m);
//		}
//		for(var i = 0; i < x.lprixC.length; i++){
//			var pr = Math.floor(x.lprixC[i] / 1000);
//			var j = l1.indexOf(pr);
//			if (j == -1)
//				l2.push(pr);
//			else {
//				l1.splice(j, 1);
//				l3.push(pr);
//			}
//		}
//		if (l3.length != 0) {
//			l3.sort(AC.Sort.num);
//			t.append("<i>Déclarés à la livraison et a priori trouvés à la réception : </i>");
//			for(var i = 0; i < l3.length; i++){
//				var pr = l3[i];
//				t.append(conv.ede(pr) + "/" + conv.e2p(pr).ed() + "   ");			
//			}
//		}
//		if (l1.length != 0) {
//			l1.sort(AC.Sort.num);
//			if (l3.length != 0)
//				t.append("<br>");
//			t.append("<i>Déclarés à la réception mais <b>non cités à la livraison</b> : </i>");
//			for(var i = 0; i < l1.length; i++){
//				var pr = l1[i];
//				t.append(conv.ede(pr) + "/" + conv.e2p(pr).ed() + "   ");			
//			}
//		}
//		if (l2.length != 0) {
//			l2.sort(AC.Sort.num);
//			if (l3.length != 0 || l1.length != 0)
//				t.append("<br>");
//			t.append("<i>Déclarés à la livraison mais <b>non trouvés à la réception</b> : </i>");
//			for(var i = 0; i < l2.length; i++){
//				var pr = l2[i];
//				t.append(conv.ede(pr) + "/" + conv.e2p(pr).ed() + "   ");			
//			}
//		}
//		var brtodo = l3.length || l1.length || l2.length ? true : false;
//		var nbd = l3.length + l1.length - etag.length;
//		if (nbd < x.qte) {
//			if (brtodo)	t.append("<br>");
//			var pdef = cv.poids * (x.qte - nbd);
//			var edef = conv.p2e(cv.poids).res * (x.qte - nbd);
//			t.append("<span class='red bold'>ATTENTION - " + nbd + " affecté(s) pour " + x.qte + 
//					" demandé(s) : " + INT.editE(l1m) + "/" + INT.editKg(l1p) + "</span>");
//			t.append("<br><span class='red bold'>ATTENTION - " + (x.qte - nbd) + " attribués avec le poids par défaut : " + 
//					INT.editE(edef) + "/" + INT.editKg(pdef) + "</span>");		
//		}
//		if (etag.length) {
//			etag.sort(AC.Sort.num);
//			if (brtodo)	t.append("<br>");
//			t.append("<span class='red bold'>ATTENTION - " + etag.length + " sur étagère : " 
//					+ INT.editE(etm) + "/" + INT.editKg(etp) + " : </span>");
//			for(var i = 0; i < etag.length; i++){
//				var pr = etag[i];
//				t.append(conv.ede(pr) + "/" + conv.e2p(pr).ed() + "   ");			
//			}	
//		}
//	}

}
AC.declare(AC.Compta);

/****************************************************************/
AC.EcGapGacAc = function(){}
AC.EcGapGacAc._static = {
}
AC.EcGapGacAc._proto = {
	className : "EcGapGacAc",
	
	init : function(id, distrib){
		this.ac = id;
		this.distrib = distrib;
		this.date = AC.ac2.viewDT.date;
		this.cellGac = APP.Ctx.loginGrp;
		this.gac = this.cellGac.code;
		if (this.ac)
			this.eltAc = this.cellGac.get(this.ac);
		AC.Screen.prototype.init.call(this, AC.ac2.viewDT);
		this._valider.css("display", "none");
		this._annuler.css("display", "none");
		return this;
	},
	
	compile : function(){
		this.gaps = AC.ac2.viewDT.gaps;
		this.allAcs = AC.ac2.viewDT.allAcs;
		this.listLivr = AC.ac2.viewDT.listLivr;
		this.lstLv = AC.ac2.viewDT.lstLv;
	},

	paintTitle : function(){
		var sb = new StringBuffer();
		var dl = AC.AMJ.dateLongue(this.date);
		var lib = this.distrib ? "Distribution des paniers" : "Comptabilité";
		if (!this.ac) {
			sb.append("<div class='bold italic large'>" + lib + " des alterconsos pour le " + dl + "</div>");
			sb.append("<div class='acAdresse medium'>");
			sb.append("<div class='bold'>Groupe Destinataire : " + this.cellGac.get(1).nom.escapeHTML() + "</div>");
			sb.append("<div>" + this.cellGac.get(1).postitContact.escapeHTML() + "</div>");
			sb.append("</div>");
			sb.append("<div class='acEnd'></div>");
		} else {
			sb.append("<div class='bold italic large'>Comptabilité de " + this.eltAc.initiales 
					+ " - " + this.eltAc.nom.escapeHTML() + " pour le " + dl + "</div>");			
		}
		return sb.toString();
	},
			
	paintContent : function(){
		var sb = new StringBuffer();
		sb.append("<div class='noprint'>");
		sb.append("<div class='acSpace1' data-ac-id='detail'></div>");
		sb.append("</div>");

		this.cps = {};
		
		for ( var i = 0, gx = 0; gx = this.gaps[i]; i++) {
			var lv = this.listLivr[gx];
			var gap = lv.cellGap.code;
			var paiement = (lv.phase == 3 || lv.phase == 2) && !this.distrib;
			this.cps[gap] = new AC.Compta(lv.cellLivrC, false, paiement);
		}

		var prems = true;
		sb.append("<div class='acTB3'>");
		if (!this.ac) {
			for (var i = 0, x = null; x = this.allAcs[i]; i++){
				if (x.status != 2)
					continue;
				if (!prems) {
					AC.Compta.space1(sb);
					sb.append("</div>");
					sb.append("<div class='dopagebreakbefore' style='font-size:0'>&nbsp;</div>");
					sb.append("<div class='acTB3'>");
				}
				sb.append(AC.Compta.titreAc(x.elt, x, false, true));
				prems = false;
				if (this.distrib){
					for ( var j = 0, gx = 0; gx = this.gaps[j]; j++)
						sb.append(this.cps[parseInt(gx, 10)].printAcDetails(x.elt, true, false));
				} else {
					var pf = true;
					for ( var j = 0, gx = 0; gx = this.gaps[j]; j++) {
						var s = this.cps[parseInt(gx, 10)].printAcComptas(x.elt);
						if (s) {
							if (!pf)
								AC.Compta.space05(sb);
							pf = false;
							sb.append(s);
							sb.append(this.cps[parseInt(gx, 10)].printAcDetails(x.elt, true, true));
						}
					}
				}
			}
		} else {
			var x = APP.Ctx.livrG.getClAc(this.lstLv, this.ac);
			x.elt = this.eltAc;
			sb.append(AC.Compta.titreAc(x.elt, x, false, true));
			var pf = true;
			for ( var j = 0, gx = 0; gx = this.gaps[j]; j++) {
				var s = this.cps[parseInt(gx, 10)].printAcComptas(x.elt);
				if (s) {
					if (!pf)
						AC.Compta.space05(sb);
					pf = false;
					sb.append(s);
					sb.append(this.cps[parseInt(gx, 10)].printAcDetails(x.elt, true, true));
				}
			}
		}
		AC.Compta.space1(sb);
		sb.append("</div>");
		return sb.toString();
	},
		
	register : function(){
		this.regDetail();
		AC.oncl(this, this._content.find(".acNomGap"), function(target){
			var gap = Util.dataIndex(target, "gap");
			AC.StackG.show({type:"Gap", gap:gap});
		});		
		AC.oncl(this, this._content.find(".acNomAp"), function(target){
			var gap = Util.dataIndex(target, "gap");
			var ap = Util.dataIndex(target);
			AC.StackG.show({type:"Ap", gap:gap, ap:ap});
		});		
		AC.oncl(this, this._content.find(".acNomProd"), function(target){
			var prod = Util.dataIndex(target);
			var gap = Util.dataIndex(target, "gap");
			AC.StackG.show({type:"Pr", gap:gap, ap:Math.floor(prod / 10000), pr:prod % 10000});
		});
		AC.oncl(this, this._content.find(".acNomAc"), function(target){
			var ac = Util.dataIndex(target);
			AC.StackG.show({type:"Ac", gac:APP.Ctx.loginGac.code, ac:ac});
		});
		AC.oncl(this, this._content.find(".paiementBtn"), function(target){
			new AC.Paiement2().init(this, target);
		});
	},
	
	enEdition : function() {
		return false;
	},

	enErreur : function() {
		return false;
	}
	
}
AC.declare(AC.EcGapGacAc, AC.Screen);

/****************************************************************/
AC.EcGap = function(livrC, ap, noComptaAC){
	this.noComptaAC = noComptaAC;
	this.ap = ap;
	this.livrC = livrC;
	this.cellGac = this.livrC.cellGac;
	this.cellGap = this.livrC.cellGap;
	this.codeLivr = this.livrC.codeLivr;
	this.slivr = this.livrC.slivr;
	AC.Screen.prototype.init.call(this, AC.ac2.viewDT);
	this._valider.css("display", "none");
	this._annuler.css("display", "none");
}
AC.EcGap._static = {
}
AC.EcGap._proto = {
	className : "EcGap",
	
	compile : function(){
	},
	
	paintTitle : function(){
		var sb = new StringBuffer();
		var dl = AC.AMJ.dateLongue(this.slivr.livr.expedition)
		sb.append("<div class='bold italic large'>Comptabilité des producteurs - Expédition du " + dl + "</div>");

		sb.append("<div class='tableA'><div class='trA0'>");
		
		sb.append("<div class='tdA' style='width:50%'>");
		sb.append("<div class='tdAdresse'>");
		sb.append("<div class='bold'>Groupe Destinataire : " + this.cellGac.get(1).nom.escapeHTML() + "</div>");
		sb.append("<div>" + this.cellGac.get(1).postitContact.escapeHTML() + "</div>");		
		sb.append("</div></div>");
		sb.append("<div class='tdB' style='width:50%'>");
		sb.append("<div class='tdAdresse'>");
		sb.append("<div class='bold'>Groupement Expéditeur : " + this.cellGap.get(1).nom.escapeHTML() + "</div>");
		sb.append("<div>" + this.cellGap.get(1).postitContact.escapeHTML() + "</div>");
		sb.append("</div></div>");
		
		sb.append("</div></div>");

		return sb.toString();
	},
			
	paintContent : function(){
		var sb = new StringBuffer();
		sb.append("<div class='noprint'><div class='acSpace1' data-ac-id='detail'></div></div>");
		sb.append(new AC.RecapCompta(this.livrC, this.ap, this.noComptaAC).print());
		sb.append("<div class='acSpace2'></div></div>");		
		var cp = new AC.Compta(this.livrC, AC.ac2.detail, null, this.noComptaAC);
		sb.append("<div class='acTB3'>");
		cp.entete(sb);
		sb.append(cp.printApAc(this.ap));
		AC.Compta.space1(sb);
		sb.append("</div>");
		
		if (cp.lstCh.length != 0) {
			sb.append("<div class='acTB3'>");
			sb.append(cp.printCheques());
			sb.append("</div>");
			this.lstCh = cp.lstCh;
		} else {
			sb.append("<div class='italic bold large'>Aucun chèque remis</div>");
		}
		
		return sb.toString();
	},
		
	register : function(){
		var self = this;
		new AC.CheckBox2(this, "detail", "Vue détaillée (détail des produits par alterconso)");
		this._detail.val(AC.ac2.detail);
		this._content.find(".detail").css("display", AC.ac2.detail ? "block" : "none");
		this._content.find(".ildetail").css("display", AC.ac2.detail ? "inline-block" : "none");
		if (AC.ac2.detail && self.livrC.selId != "A"){
			self.livrC.upgrade();
			AC.Req.sync();
		}
		this._detail.jqCont.off("dataentry").on("dataentry", function(){
			AC.ac2.detail = self._detail.val();
			self._content.find(".detail").css("display", AC.ac2.detail ? "block" : "none");
			self._content.find(".ildetail").css("display", AC.ac2.detail ? "inline-block" : "none");
			if (AC.ac2.detail && self.livrC.selId != "A"){
				self.livrC.upgrade();
				AC.Req.sync();
			} else
				self.display();
		});
		AC.oncl(this, this._content.find(".acNomAp"), function(target){
			var ap = Util.dataIndex(target);
			AC.StackG.show({type:"Ap", gap:this.cellGap.code, ap:ap});
		});
		AC.oncl(this, this._content.find(".acNomGap"), function(target){
			var gap = Util.dataIndex(target, "gap");
			AC.StackG.show({type:"Gap", gap:gap});
		});		
		AC.oncl(this, this._content.find(".acNomProd"), function(target){
			var prod = Util.dataIndex(target);
			AC.StackG.show({type:"Pr", gap:this.cellGap.code, ap:Math.floor(prod / 10000), pr:prod % 10000});
		});
		AC.oncl(this, this._content.find(".acNomAc"), function(target){
			var ac = Util.dataIndex(target);
			AC.StackG.show({type:"Ac", gac:this.cellGac.code, ac:ac});
		});
		AC.oncl(this, this._content.find(".justif"), function(target){
			new AC.KBJustif().init(this, target);
		});
		AC.oncl(this, this._content.find(".exportCheques"), function(target){
			this.exportCheques();
		});
	},
	
	exportCheques : function(){
		var s = JSON.stringify(this.lstCh);
		AC.Req.submitForm2(62, "cheques.xlsx", s);		
	},

	enEdition : function() {
		return false;
	},

	enErreur : function() {
		return false;
	}
	
}
AC.declare(AC.EcGap, AC.Screen);

/****************************************************************/
AC.EcAp = function(livrP, cellGap, livr, sLivr, ap){
	this.livrP = livrP;
	this.sLivr = sLivr;
	this.dl = AC.AMJ.dateLongue(livr.expedition);
	this.cellGap = cellGap;
	this.ap = ap;
	this.eltAp = this.cellGap.get(ap);
	this.codeLivr = livr.codeLivr;
	AC.Screen.prototype.init.call(this, AC.ac2.viewDT);
	this._valider.css("display", "none");
	this._annuler.css("display", "none");
}
AC.EcAp._static = {
}
AC.EcAp._proto = {
	className : "EcAp",
	
	compile : function(){
	},
	
	paintTitle : function(){
		var sb = new StringBuffer();
		sb.append("<div class='bold italic large'>Comptabilité des producteurs - Expédition du " + this.dl + "</div>");

		sb.append("<div class='tableA'><div class='trA0'>");
		
		sb.append("<div class='tdA' style='width:50%'>");
		sb.append("<div class='tdAdresse'>");
		sb.append("<div class='bold'>Producteur : " + Util.editEltH(this.eltAp).escapeHTML() + "</div>");
		sb.append("<div>" + this.eltAp.postitContact.escapeHTML() + "</div>");
		sb.append("</div></div>");
		sb.append("<div class='tdB' style='width:50%'>");
		sb.append("<div class='tdAdresse'>");
		sb.append("<div class='bold'>Groupement Expéditeur : " + this.cellGap.get(1).nom.escapeHTML() + "</div>");
		if (this.eltAp.code != 1)
			sb.append("<div>" + this.cellGap.get(1).postitContact.escapeHTML() + "</div>");
		sb.append("</div></div>");
		
		sb.append("</div></div>");
		return sb.toString();
	},
	
	paintContent : function(){
		this.lstCh = [];
		var sb = new StringBuffer();
		sb.append("<div class='noprint'><div class='acSpace1' data-ac-id='detail'></div></div>");

		sb.append(new AC.RecapComptaAp(this.livrP, this.codeLivr, this.ap, this.sLivr).print());
		
		for (var i = 0, x = null; x = this.sLivr[i]; i++) {
			this.livrC = x.livrC;
			this.cellGac = this.livrC.cellGac;
			this.slivr = this.livrC.slivr;
			sb.append("<div class='dopagebreakbefore' ></div>");
			sb.append(this.paintContentLoc());
		}
		
		if (this.lstCh.length != 0) {
			sb.append("<div class='acTB3'>");
			sb.append(AC.Compta.printAllCheques(this.lstCh));
			sb.append("</div>");
		} else {
			sb.append("<div class='italic bold'>Aucun chèque n'a été émis</div>");
		}

		return sb.toString();
	},
		
	paintContentLoc : function(){
		var noComptaAC = AC.ac2.viewDT.optionGacs[this.livrC.cellGac.code];
		var cp = new AC.Compta(this.livrC, null, null, noComptaAC);
		var s = cp.printApAc2(this.ap);
		if (s) {
			var sb = new StringBuffer();
			sb.append("<div class='acSpace2'></div></div>");
			sb.append("<div class='acTB3'>");
			cp.entete(sb);
			sb.append(s);
			AC.Compta.space1(sb);
			sb.append("</div>");
		}
		
		if (cp.lstCh.length != 0)
			for(var i = 0, ch = null; ch = cp.lstCh[i]; i++)
				this.lstCh.push(ch);
		
		return s ? sb.toString() : "";
	},
		
	register : function(){
		this.regDetail();
		AC.oncl(this, this._content.find(".exportCheques"), function(target){
			this.exportCheques();
		});
		AC.oncl(this, this._content.find(".remiseCheque"), function(target){
			new AC.KBCHQ().init(this, this.retourRemiseCheque, target, this.eltAp);
		});
		AC.oncl(this, this._content.find(".acNomAp"), function(target){
			var ap = Util.dataIndex(target);
			AC.StackG.show({type:"Ap", gap:this.cellGap.code, ap:ap});
		});
		AC.oncl(this, this._content.find(".acNomGac"), function(target){
			var gac = Util.dataIndex(target, "gac");
			AC.StackG.show({type:"Gac", gac:gac});
		});		
		AC.oncl(this, this._content.find(".acNomProd"), function(target){
			var prod = Util.dataIndex(target);
			AC.StackG.show({type:"Pr", gap:this.cellGap.code, ap:Math.floor(prod / 10000), pr:prod % 10000});
		});
		AC.oncl(this, this._content.find(".acNomAc"), function(target){
			var ac = Util.dataIndex(target);
			var gac = Util.dataIndex(target, "gac");
			AC.StackG.show({type:"Ac", gac:gac, ac:ac});
		});
	},
	
	exportCheques : function(){
		var s = JSON.stringify(this.lstCh);
		AC.Req.submitForm2(62, "cheques.xlsx", s);		
	},

	retourRemiseCheque : function(ok, ap, gac, val) {
		if (!ok) return;
		var arg = {op:"40"};
		arg.gap = this.cellGap.code;
		arg.apr = ap;
		arg.gac = gac;
		arg.codeLivr = this.codeLivr;
		arg.cheque = val;
		arg.operation = "Enregistrement d'une remise de chèques";
		AC.Req.post(this, "alterconsos", arg, function(){
			AC.Message.info("Enregistrement fait.");
		}, "Echec de l'enregistrement : " );
	},
	
	enEdition : function() {
		return false;
	},

	enErreur : function() {
		return false;
	}
	
}
AC.declare(AC.EcAp, AC.Screen);

/****************************************************************/
AC.EcAp2 = function(cellGap, livr, sLivr, ap){
	this.sLivr = sLivr;
	this.exped = livr.expedition;
	this.dl = AC.AMJ.dateLongue(livr.expedition);
	this.cellGap = cellGap;
	this.ap = ap;
	this.eltAp = this.cellGap.get(ap);
	this.codeLivr = livr.codeLivr;
	AC.Screen.prototype.init.call(this, AC.ac2.viewDT);
	this._valider.css("display", "none");
	this._annuler.css("display", "none");
}
AC.EcAp2._static = {
}
AC.EcAp2._proto = {
	className : "EcAp2",
	
	compile : function(){
		this.taux = this.cellGap.tauxPrelev(this.exped)[this.ap];
		this.synthAp = AC.ac2.viewDT.synthAps[this.ap];
		this.noComptaAC = AC.ac2.viewDT.optionGacs;
	},
			
	paintTitle : function(){
		var sb = new StringBuffer();
		sb.append("<div class='bold italic large'>Synthèse Comptable - Expédition du " + this.dl + "</div>");

		sb.append("<div class='tableA'><div class='trA0'>");
		
		sb.append("<div class='tdAdresse'>");
		sb.append("<div class='bold'>Producteur : " + Util.editEltH(this.eltAp).escapeHTML() + "</div>");
		if (this.taux)
			sb.append("<div>Taux de prélèvement : " + this.taux + "%</div>");
		sb.append("</div>");
		sb.append("</div></div>");
		return sb.toString();
	},
	
	paintContent : function(){
		this.typx = ["", "prix fixe", "préemb. au Kg", "vrac au Kg"];
		var sb = new StringBuffer();
		sb.append("<div class='acCBBlock'><div class='acCBItem' data-ac-id='detail'></div>");

		sb.append("<div class='acTR1TC2'>");
		sb.append("<div class='acTDl'>Producteur</div>");
		sb.append("<div class='acTDc2'>souhaité<br>vendue</div>");
		sb.append("<div class='acTDc2'>Nbr.<br>Lignes</div>");
		sb.append("<div class='acTDc4'>Poids Froid</div>");
		sb.append("<div class='acTDc4'>Poids Sec</div>");
		sb.append("<div class='acTDc4'>Poids Total</div>");
		sb.append("<div class='acTDc4'>Montant<br>Net prod.</div>");
		sb.append("<div class='acTDc2'>Taux<br>prélevé</div>");
		sb.append("<div class='acTDc2'>Suppl.<br>Type</div>");
		sb.append("</div>");
		
		var paire = true;
		var ap = this.ap;
		var xx = this.synthAp;
		var eltAp = this.cellGap.get(ap);
		sb.append("<div class='acTR1TC" + (paire ? "3 " : "4 ") + "'>");			
		sb.append("<div class='acTDl'>");
		sb.append("<div class='bold moyen'>" + Util.editEltH(this.eltAp) + "</div>");
		sb.append("</div>");
		
		this.paintLine(sb, xx, true);		
		paire = !paire;
			
		for(var i = 0, x = null; x = xx.produits[i]; i++){
			sb.append("<div class='acTR1TC" + (paire ? "3 " : "4 ") + "' style='font-weight:normal'>");
			sb.append("<div class='acTDl'>");
			sb.append("<div class='moyen'>" + x.label + " [" + x.code + "] " + 
					this.editDiffs(x) + "</div>");
			sb.append("</div>");

			this.paintLine(sb, x, false);	
			paire = !paire;			
		}
		
		return sb.toString();
	},

	editDiffs : function(x){
		var sb = new StringBuffer();
		var b = false;
		sb.append("<div class='detail medium'>");
		for(gac in x.gacs){
			var noCompta = this.noComptaAC[gac];
			var y = x.gacs[gac];
			var lp = y.typePrix == 2 ? this.editPqs(y.lprix, y.lprixC) : "";
			if(y.prix || y.prixD){
				b = true;
				var ingac = "<span" + (noCompta ? ">" : " class='vert'>") + APP.Ctx.dir.getElement(1, gac).initiales + "</span>";
				var qDX = x.pd.parDemi ? INT.demi(y.qteDX) : y.qteDX;
				var qT = x.pd.parDemi ? INT.demi(y.qte) : y.qte;
				var qTS = x.pd.parDemi ? INT.demi(y.qteS) : y.qteS;
				sb.append("<div class='acDetCP'><b>" + ingac + "</b> ");
				if (noCompta) {
					if (qT != qDX) 
						sb.append("<span class='red'>(AC: " + qT + ") </span>");
				} else {
					var b1 = y.prix != y.prixD || qT != qDX;
					var b2 = qT != qTS;
					if (b1 || b2) {
						var qx = b2 ? ("<span class='red'>" + qT + " [" + qTS + "]</span>") : qT;
						var clx = b1 ? " class='red'" : "";
						sb.append("<span" + clx + ">(AC: " + qx + " / " + INT.editE(y.prix) + ") </span>");
					}
				}
				sb.append(qDX + " / " + INT.editE(y.prixD));
				if (lp ) sb.append(" - " + lp);
				sb.append("</div>");
			}
		}
		sb.append("</div>");
		return b ? sb.toString() : "";
	},

//	editDiffs : function(x){
//		var sb = new StringBuffer();
//		var b = false;
//		sb.append("<div class='detail medium'>");
//		for(gac in x.gacs){
//			var noCompta = this.noComptaAC[gac];
//			var y = x.gacs[gac];
//			var lp = y.typePrix == 2 ? this.editPqs(y.lprix, y.lprixC) : "";
//			if(y.qte != y.qteCX || lp){
//				b = true;
//				var ingac = APP.Ctx.dir.getElement(1, gac).initiales;
//				var qCX = x.pd.parDemi ? INT.demi(y.qteCX) : y.qteCX;
//				var qT = x.pd.parDemi ? INT.demi(y.qte) : y.qte;
//				sb.append("<div class='acDetCP'><b>" + ingac + "</b> " + qT + "/" + qCX + " ");
//				sb.append(lp);
//				sb.append("</div>");
//			}
//		}
//		sb.append("</div>");
//		return b ? sb.toString() : "";
//	},

	editPqs : function(l, lc) {
		var l1 = []; // lprix seulement
		var l2 = []; // lprixC seulement
		var l3 = []; // les deux

		var libs = [
			["<i>Déchargés :</i>", "<i>Déchargés :</i>", "<i>Déchargés <b>NON chargés</b> :</i>"],
			["<i>Chargés :</i>", "<i>Chargés :</i>", "<i>Chargés <b>NON déchargés</b> :</i>"],
			["<i>Chargés et déchargés :</i>", "<i>Chargés et déchargés :</i>", "<i>Chargés et déchargés :</i>"]
			];
		var il = l.length ? (lc.length ? 2 : 0) : (lc.length ? 1 : 2);
		
		for(var i = 0, p = 0; p = l[i]; i++) l1.push(Math.floor(p / 1000));

		for(var i = 0; i < lc.length; i++){
			var pr = Math.floor(lc[i] / 1000);
			var j = l1.indexOf(pr);
			if (j == -1)
				l2.push(pr);
			else {
				l1.splice(j, 1);
				l3.push(pr);
			}
		}
		
		var t = new StringBuffer();

		if (l3.length != 0) {
			l3.sort(AC.Sort.num);
			t.append(libs[2][il]);
			for(var i = 0; i < l3.length; i++)
				t.append(" " + INT.editE(l3[i]));
		}
		if (l1.length != 0) {
			l1.sort(AC.Sort.num);
			if (l3.length != 0)
				t.append("<br>");
			t.append(libs[0][il]);
			for(var i = 0; i < l1.length; i++)
				t.append(" " + INT.editE(l1[i]));
		}
		if (l2.length != 0) {
			l2.sort(AC.Sort.num);
			if (l3.length != 0 || l1.length != 0)
				t.append("<br>");
			t.append(libs[1][il]);
			for(var i = 0; i < l2.length; i++)
				t.append(" " + INT.editE(l2[i]));
		}

		return t.toString();
	},
	
//	editPqs : function(l, lc) {
//		var sb = new StringBuffer();
//		var l1 = [];
//		for(var i = 0, p = 0; p = l[i]; i++) l1.push(Math.floor(p / 1000));
//		var l2 = [];
//		for(var i = 0, p = 0; p = lc[i]; i++) l2.push(Math.floor(p / 1000));
//		var r = [];
//		for(var i = 0, p = 0; p = l1[i]; i++) {
//			var j = l2.indexOf(p);
//			if (j == -1)
//				r.push(p);
//			else
//				l2.splice(j, 1);
//		};
//		if (l2.length != 0){
//			sb.append("&nbsp;Livrés non reçus:");
//			for(var i = 0, p = 0; p = l2[i]; i++)
//				sb.append(" " + INT.editE(p));
//		}
//		if (l2.length != 0 && r.length != 0)
//			sb.append("<br>&nbsp;&nbsp;&nbsp;");
//		if (r.length != 0){
//			sb.append("Reçus non livrés:");
//			for(var i = 0, p = 0; p = r[i]; i++)
//				sb.append(" " + INT.editE(p));
//		}
//		return sb.toString();
//	},

	paintLine : function(sb, x, isTot) {
		if (!isTot) {
			var b1 = x.qteS != x.qte;
			var sp1 = "<span" + (b1 ? " class='red'>[ " : ">");
			var sp2 = b1 ? " ]</span>" : "</span>";
			var c = sp1 + (x.pd.parDemi ? INT.demi(x.qteS) : x.qteS) + sp2;
			if (b1)
				c += "<br>" + (x.pd.parDemi ? INT.demi(x.qte) : x.qte);
			sb.append("<div class='acTDc2'>" + c + "</div>");
		} else
			sb.append("<div class='acTDc2'>&nbsp;</div>");

		sb.append("<div class='acTDc2'>" + (x.nblg ? x.nblg : "&nbsp;") + "</div>");
		
		c = x.poidsFB ? INT.editKg(x.poidsFB) : "-";
		if (x.poidsFB != x.poidsF)
			c += "<br>" + INT.editKg(x.poidsF);
		sb.append("<div class='acTDc4'>" + c + "</div>");

		c = x.poidsSB ? INT.editKg(x.poidsSB) : "-";;
		if (x.poidsSB != x.poidsS)
			c += "<br>" + INT.editKg(x.poidsS);
		sb.append("<div class='acTDc4'>" + c + "</div>");

		c = x.poidsTB ? INT.editKg(x.poidsTB) : "-";;
		if (x.poidsTB != x.poidsT)
			c += "<br>" + INT.editKg(x.poids);
		sb.append("<div class='acTDc4'>" + c + "</div>");

		c = INT.editE(x.prixB);
		if (x.prixB != x.prixN)
			c += "<br>" + INT.editE(x.prixN);
		sb.append("<div class='acTDc4'>" + c + "</div>");

		c = this.taux ? "" + this.taux + "%" : "&nbsp;";
		if (x.prelev)
			c += "<br>" + INT.editE(x.prelev);
		sb.append("<div class='acTDc2'>" + c + "</div>");

		if (isTot) {
			c = x.suppls ? INT.editE(x.suppls) : "&nbsp;";
			if (isTot && x.avoirs)
				c += "<br>-" + INT.editE(-x.avoirs);
		} else
			c = this.typx[x.typePrix];
		sb.append("<div class='acTDc2 acTDLast'>" + c + "</div>");
		sb.append("</div>");
	},
	
	register : function(){
		this.regDetail();
	},
	
	enEdition : function() {
		return false;
	},

	enErreur : function() {
		return false;
	}
	
}
AC.declare(AC.EcAp2, AC.Screen);
