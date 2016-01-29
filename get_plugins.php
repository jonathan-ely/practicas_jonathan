<?php

require 'common.php';

$authorCache = array();

ini_set('zlib.output_compression','Off');

main();

function main() {

    $data = parseRepoXML();

    //$data = $data->fermat;

    $platformList = [];
    $layerList = [];
    $pluginList = [];
    $superLayerList = [];

    $layerIndex = 0;
    $platformIndex = 0;
    $superLayerIndex = 0;

    foreach($data->platforms->children() as $platform) {

        array_push($platformList, array(
            'code' => strval($platform['code']),
            'name' => strval($platform['name']),
            'logo' => strval($platform['logo']),
            'index' => $platformIndex
        ));
        
        if($platform['dependsOn'])
            $platformList[$platformIndex]['dependsOn'] = strval($platform['dependsOn']);
        
        $platformIndex++;

        foreach($platform->children() as $layer) {

            if( searchName(strval($layer['name']), $layerList) === false) {

                array_push($layerList, array( 'name' => strval($layer['name']), 'index' => $layerIndex, 'super_layer' => false));
                $layerIndex++;
            }

            if(isset($layer['super_layer'])) {
                
                foreach($data->super_layers->children() as $super_layer) {
                    
                    if( search('code', strval($super_layer['code']), $superLayerList) === null) {

                        array_push($superLayerList, array( 
                            'name' => strval($super_layer['name']),
                            'code' => strval($super_layer['code']),
                            'index' => $superLayerIndex,
                        ));
        
                        if($super_layer['dependsOn'])
                            $superLayerList[$superLayerIndex]['dependsOn'] = strval($super_layer['dependsOn']);
                        
                        $superLayerIndex++;
                    }

                    if(strval($super_layer['code']) === strval($layer['super_layer'])) {

                        foreach($super_layer->children() as $sub_superLayer) {
                            
                            if( searchName(strval($sub_superLayer['name']), $layerList) === false) {

                                array_push($layerList, array( 'name' => strval($sub_superLayer['name']), 'index' => $layerIndex, 'super_layer' => strval($super_layer['code'])));
                                $layerIndex++;
                            }

                            if($sub_superLayer->androids) {
                                foreach($sub_superLayer->androids->children() as $android) {
                                    
                                $newElement = createElement($android, 'Android', $sub_superLayer);
                                array_push($pluginList, $newElement);
                                }
                            }

                            if($sub_superLayer->plugins) {
                                foreach($sub_superLayer->plugins->children() as $plugin) {

                                $newElement = createElement($plugin, 'Plugin', $sub_superLayer);
                                array_push($pluginList, $newElement);
                                }
                            }

                            if($sub_superLayer->addons) {
                                foreach($sub_superLayer->addons->children() as $addon) {
                                    
                                    $newElement = createElement($addon, 'Addon', $sub_superLayer);
                                    array_push($pluginList, $newElement);
                                }
                            }
                            
                            if($sub_superLayer->libraries) {
                                foreach($sub_superLayer->libraries->children() as $library) {
                                    
                                    $newElement = createElement($library, 'Library', $sub_superLayer);
                                    array_push($pluginList, $newElement);
                                }
                            }
                        }
                    }
                }
            }
            else {

                if($layer->androids) {
                    foreach($layer->androids->children() as $android) {
                        
                    $newElement = createElement($android, 'Android', $layer, $platform);
                    array_push($pluginList, $newElement);
                    }
                }

                if($layer->plugins) {
                    foreach($layer->plugins->children() as $plugin) {

                        $newElement = createElement($plugin, 'Plugin', $layer, $platform);
                        array_push($pluginList, $newElement);
                    }
                }

                if($layer->addons) {
                    foreach($layer->addons->children() as $addon) {
                        
                    $newElement = createElement($addon, 'Addon', $layer, $platform);
                    array_push($pluginList, $newElement);
                    }
                }
                
                if($layer->libraries) {
                    foreach($layer->libraries->children() as $library) {

                        $newElement = createElement($library, 'Library', $layer, $platform);
                        array_push($pluginList, $newElement);
                    }
                }
            }
        }
    }

    $result = array(
        'groups' => $platformList,
        'layers' => $layerList,
        'plugins' => $pluginList,
        'superLayers' => $superLayerList
        );
    
    $output = gzencode(json_encode($result));
    
    header('Content-Encoding: gzip');
    header("Access-Control-Allow-Origin: *");
    //header('Content-Length: '.strlen($gzipoutput));

    echo $output;
}

//=======================================================================================================================

function searchName($name, $list) {
    
    foreach($list as $element) {
        if($element['name'] === $name) return true;
    }
    
    return false;
}

function lookForAuthor($element) {
    
    $author = null;
    global $authorCache;
    
    $userUrl = "https://api.github.com/users/";
    
    if(!$element->authors) return null;
    
    foreach($element->authors->children() as $actual) {
        
        if( strval($actual['scope']) === 'implementation' ) {
            
            if($author == null || $author['percentage'] < (int)strval($actual['percentage'])) {
                
                $author = array(
                    'name' => strval($actual['name']),
                    'percentage' => (int)strval($actual['percentage'])
                    );
                
                $cache = search('name', $author['name'], $authorCache);
                
                if ( $cache === null ) {
                    
                    $userData = askGitHub($userUrl . $author['name']);
                    $pictureUrl = strval($userData["avatar_url"]);
                    $realName = strval($userData['name']);
                    $mail = strval($userData['email']);
                    
                    array_push( $authorCache, array(
                        'name' => $author['name'],
                        'img' => $pictureUrl,
                        'realName' => $realName,
                        'email' => $mail
                    ));
                }
                else {
                    $pictureUrl = $cache['img'];
                    $realName = $cache['realName'];
                    $mail = $cache['email'];
                }
                
                $author['picture'] = $pictureUrl;
                $author['realName'] = $realName;
                $author['email'] = $mail;
            }
        }
    }
    
    return $author;
}

function createElement($element, $type, $layer, $platform = null) {
    
    if ( $element['name'] == null ) return null;
    
    $newElement = array(
        'name' => strval($element['name']),
        'description' => strval($element['description']),
        'code_level' => strval($element['code-level']),
        'layer' => strval($layer['name']),
        'difficulty' => (int)strval($element['difficulty']),
        'type' => $type
        );
    
    
    if ( $platform != null) $newElement['group'] = strval($platform['code']);
    
    $author = lookForAuthor($element);

    if($author != null) {

        $newElement['authorName'] = $author['name'];
        $newElement['authorPicture'] = $author['picture'];
        $newElement['authorRealName'] = $author['realName'];
        $newElement['authorEmail'] = $author['email'];
    }
    
    if ( $element->life_cycle ) {
        
        $deadlines = [];
        
        foreach ( $element->life_cycle->children() as $status ) {
            
            $newDeadline = array(
                'name' => strval($status['name']),
                'reached' => strval($status['reached']),
                'target' => strval($status['target'])
                );
            
            array_push( $deadlines, $newDeadline );
        }
        
        $newElement['life_cycle'] = $deadlines;
    }
    
    return $newElement;
}

?>