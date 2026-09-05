Run the preserved Python behavior tests from `ai-service/` after installing dependencies:

```bash
cd ai-service
pytest ../tests/test_core_logic_legacy.py -q
```

The Node API can be smoke tested with:

```bash
curl http://localhost:4000/api/health
```
