package com.utn.frc.smartparkingutn.controller;

import org.springframework.data.neo4j.core.Neo4jClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.neo4j.driver.types.Node;
import org.neo4j.driver.types.Relationship;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/neo4j")
@CrossOrigin(origins = "*")
public class Neo4jConsoleController {

    private final Neo4jClient neo4jClient;

    public Neo4jConsoleController(Neo4jClient neo4jClient) {
        this.neo4jClient = neo4jClient;
    }

    @PostMapping("/query")
    public ResponseEntity<?> executeQuery(@RequestBody Map<String, String> payload) {
        String cypher = payload.get("query");
        if (cypher == null || cypher.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Falta la query cypher."));
        }

        try {
            Collection<Map<String, Object>> result = neo4jClient.query(cypher).fetch().all();
            List<Map<String, Object>> parsedResult = result.stream().map(row -> {
                Map<String, Object> parsedRow = new HashMap<>();
                for (Map.Entry<String, Object> entry : row.entrySet()) {
                    parsedRow.put(entry.getKey(), parseNeo4jEntity(entry.getValue()));
                }
                return parsedRow;
            }).collect(Collectors.toList());
            
            return ResponseEntity.ok(parsedResult);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Object parseNeo4jEntity(Object obj) {
        if (obj instanceof Node node) {
            Map<String, Object> map = new HashMap<>();
            map.put("_elementId", node.elementId());
            map.put("labels", node.labels());
            map.putAll(node.asMap());
            return map;
        } else if (obj instanceof Relationship rel) {
            Map<String, Object> map = new HashMap<>();
            map.put("_elementId", rel.elementId());
            map.put("type", rel.type());
            map.put("startNodeId", rel.startNodeElementId());
            map.put("endNodeId", rel.endNodeElementId());
            map.putAll(rel.asMap());
            return map;
        } else if (obj instanceof Collection<?> coll) {
            return coll.stream().map(this::parseNeo4jEntity).collect(Collectors.toList());
        } else if (obj instanceof Map<?, ?> map) {
            Map<String, Object> newMap = new HashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                newMap.put(String.valueOf(entry.getKey()), parseNeo4jEntity(entry.getValue()));
            }
            return newMap;
        }
        return obj;
    }
}
