<?php 

require 'common.php';
ini_set('zlib.output_compression','Off');

main();

function main() {
	//echo $_REQUEST["url"];
	$contentUrl = "https://api.github.com/repos/bitDubai/fermat/contents/" . $_REQUEST["url"];
	//echo  $contentUrl;
	$contentData = askGitHub($contentUrl);
	/*if (in_array("message", $contentData)) {
		echo "found message in array";
		if (strcmp($contentData["message"], "Not Found") == 0) {
			echo false;
		} else {
			echo true;
		}
	} else {
		echo "not found message in array";
	}*/
	//echo  var_dump($contentData);
	$output = gzencode(json_encode($contentData));
    //header('Content-Encoding: gzip');
    //header('Content-Length: '.strlen($gzipoutput));
    echo gzdecode($output);
}



?>