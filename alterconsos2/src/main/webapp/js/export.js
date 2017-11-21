function dothejob() {
	var search = "&" + window.location.search.substring(1);
	var args = ["ad", "at", "ag", "au", "d", "op", "sn"];
	var values = {};
	for(var i = 0, arg = null; arg = args[i]; i++){
		var inp = document.getElementById(arg);
		var x = "&" + arg + "=";
		var j = search.indexOf(x);
		if (j == -1)
			continue;
		var s1 = search.substring(j + x.length);
		j = s1.indexOf("&");
		var s2 = (j == -1) ? s1 : s1.substring(0, j);
		if (inp)
			inp.value = s2;
		values[arg] = s2;
	}
	var pwd = document.getElementById("pwd");
	var p = SHA1(pwd.value + values.at + values.ag);
	document.getElementById("ap").value = p;
	var f1 = document.getElementById("form1");
	if (values.op == "50")
		f1.action = "alterconsos/export";
	if (values.op == "54" || values.op == "58")
		f1.action = "alterconsos/export/AC_" + values.d + "_" + values.sn + ".xls";
	f1.submit();
}