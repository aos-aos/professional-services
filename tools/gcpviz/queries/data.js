var containerResourceTypes = [
    "cloudresourcemanager.googleapis.com/Organization",
    "cloudresourcemanager.googleapis.com/Folder",
    "cloudresourcemanager.googleapis.com/Project",
];
var wantedResourceTypes = [
    "bigquery.googleapis.com/Dataset",
    "bigquery.googleapis.com/Table",
    "bigtableadmin.googleapis.com/Cluster",
    "bigtableadmin.googleapis.com/Instance",
    "bigtableadmin.googleapis.com/Table",
    "dataproc.googleapis.com/Cluster",
    "dataproc.googleapis.com/Job",
    "pubsub.googleapis.com/Topic",
    "pubsub.googleapis.com/Subscription",
    "spanner.googleapis.com/Instance",
    "spanner.googleapis.com/Database",
    "sqladmin.googleapis.com/Instance",
    "storage.googleapis.com/Bucket",
    "datafusion.googleapis.com/Instance",
];
var resourceTypes = containerResourceTypes.concat(wantedResourceTypes);

var nodes = [];
var follow = function (n, depth) {
    var out = n.tag("parent").labelContext(resourceTypes, "type").out("child");
    if (out.count() == 0) {
        return;
    }
    nodes = nodes.concat(out.tagArray());
    follow(out, depth + 1);
};

// Filters disconnected vertexes from results
var filterEmptyNodes = function (nodes) {
    var filteredNodes = [];
    var m = g.Morphism().labelContext(resourceTypes, "type").in(["child", "uses"]);
    nodes.forEach(function (node) {
        if (wantedResourceTypes.indexOf(node.type) > -1) {
            if (g.V(node.id).follow(m).count() > 0) {
                filteredNodes.push(node);
            }
        } else {
            filteredNodes.push(node);
        }
    });
    return filteredNodes;
}

// Filters empty projects from results
var filterEmptyProjects = function (nodes) {
    var filteredNodes = [];
    var projectM = g.Morphism().labelContext(resourceTypes, "type").in(["child", "uses"]);
    nodes.forEach(function (node) {
        if (node.type == "cloudresourcemanager.googleapis.com/Project") {
            if (g.V(node.id).follow(projectM).count() > 1) {
                filteredNodes.push(node);
            }
        } else {
            filteredNodes.push(node);
        }
    });
    return filteredNodes;
}

// Filters empty folders from results
var filterEmptyFolders = function (nodes) {
    var folderMap = {};
    var folderItemCount = {};
    var filteredNodes = [];

    nodes.forEach(function (node) {
        if (containerResourceTypes.indexOf(node.type) > -1) {
            folderMap[node.id] = node;
            if (node.type == "cloudresourcemanager.googleapis.com/Folder") {
                folderItemCount[node.id] = 0;
            }
        }
    });

    nodes.forEach(function (node) {
        if (node.type == "cloudresourcemanager.googleapis.com/Project") {
            var iNode = node;
            while (iNode && iNode.parent in folderMap) {
                folderItemCount[iNode.parent] += 1;
                iNode = folderMap[iNode.parent];
            }
        }
    });

    nodes.forEach(function (node) {
        if (node.type == "cloudresourcemanager.googleapis.com/Folder") {
            if (folderItemCount[node.id] > 0) {
                filteredNodes.push(node);
            }
        } else {
            filteredNodes.push(node);
        }
    });
    return filteredNodes;
}

var root = g.V("{{ index .Organizations 0 }}");
follow(root, 1);
filterEmptyFolders(filterEmptyProjects(root.tagArray().concat(nodes))).forEach(function (node) {
    g.emit(node);
});