package com.dataapp.record.infrastructure.persistence.po;

public class RecordDetailRowPO {

    private Long id;
    private Long recordId;
    private String detailTableKey;
    private Integer rowNo;
    private String rowDataJson;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getRecordId() {
        return recordId;
    }

    public void setRecordId(Long recordId) {
        this.recordId = recordId;
    }

    public String getDetailTableKey() {
        return detailTableKey;
    }

    public void setDetailTableKey(String detailTableKey) {
        this.detailTableKey = detailTableKey;
    }

    public Integer getRowNo() {
        return rowNo;
    }

    public void setRowNo(Integer rowNo) {
        this.rowNo = rowNo;
    }

    public String getRowDataJson() {
        return rowDataJson;
    }

    public void setRowDataJson(String rowDataJson) {
        this.rowDataJson = rowDataJson;
    }
}
