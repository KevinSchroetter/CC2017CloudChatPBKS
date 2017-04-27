/*
 * Replacing some critical characters
 */
function pbksValidate(string){
	string = string.replace(/&lt;/g, " ");
	string = string.replace(/</g, " ");
	string = string.replace(/&gt;/g, " ");
	string = string.replace(/>/g, " ");
	string = string.replace(/&amp;/g, "&");
	string = string.replace(/&quot;/g, "");
	return string;
}
