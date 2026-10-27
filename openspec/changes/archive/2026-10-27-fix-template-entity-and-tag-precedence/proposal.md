# Fix template entity matching and explicit tag precedence

Block declarations currently match elements, and tag declarations overwrite explicit BEMJSON tags. Website templates compensate with predicates. Match each entity kind directly and preserve explicit tag values in the engine instead.
